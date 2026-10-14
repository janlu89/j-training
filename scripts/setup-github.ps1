<#
.SYNOPSIS
  Creates and configures the j-training GitHub repository via GitHub CLI.

.DESCRIPTION
  Idempotent: every step checks the current state first, so the script can be re-run safely
  (e.g. with -RequiredStatusChecks once CI has produced its first green run).

  Steps:
    1. Create the public repository and push master.
    2. Create dev from master and make it the default branch.
    3. Merge settings: squash + merge commit only, no rebase, delete head branches after merge.
    4. Rulesets for master and dev: PR required, 0 approvals, no force push, no deletion,
       merge method enforced per branch, optional required status checks.
    5. GitHub Pages with "GitHub Actions" as source; github-pages environment allows master.

.PARAMETER RequiredStatusChecks
  Status check contexts (CI job names) to require on both branches. Leave empty on first run:
  a check can only be required after it has reported at least once.

.EXAMPLE
  .\scripts\setup-github.ps1
.EXAMPLE
  .\scripts\setup-github.ps1 -RequiredStatusChecks 'ci'
#>
[CmdletBinding()]
param(
  [string]$RepoName = 'j-training',
  [string]$Description = 'Personal workout tracker - Angular 21 PWA, local-only data',
  [string[]]$RequiredStatusChecks = @()
)

$ErrorActionPreference = 'Continue'
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Assert-ExitCode([string]$Action) {
  if ($LASTEXITCODE -ne 0) {
    throw "Failed: $Action (exit code $LASTEXITCODE)"
  }
}

function Test-GhApi([string]$Endpoint) {
  gh api $Endpoint --silent 2>$null
  return $LASTEXITCODE -eq 0
}

function Invoke-GhApiJson([string]$Method, [string]$Endpoint, [hashtable]$Body) {
  $file = [System.IO.Path]::GetTempFileName()
  try {
    $json = $Body | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($file, $json, (New-Object System.Text.UTF8Encoding $false))
    gh api -X $Method $Endpoint --input $file --silent
    Assert-ExitCode "$Method $Endpoint"
  }
  finally {
    Remove-Item $file -ErrorAction SilentlyContinue
  }
}

function Assert-Prerequisites {
  Write-Step 'Checking prerequisites'
  gh auth status 2>$null | Out-Null
  Assert-ExitCode 'gh auth status (run: gh auth login)'

  $branch = git rev-parse --abbrev-ref HEAD
  Assert-ExitCode 'git rev-parse (is this a git repository with at least one commit?)'
  if ($branch -ne 'master') {
    throw "Current branch is '$branch': run this script from master."
  }
  if (git status --porcelain) {
    throw 'Working tree is not clean: commit or stash your changes first.'
  }
}

function Get-RepoFullName {
  $owner = gh api user --jq .login
  Assert-ExitCode 'gh api user'
  return "$owner/$RepoName"
}

function New-RepositoryIfMissing([string]$FullName) {
  Write-Step "Repository $FullName"
  if (Test-GhApi "repos/$FullName") {
    Write-Host 'Already exists.'
    if (-not (git remote | Where-Object { $_ -eq 'origin' })) {
      git remote add origin "https://github.com/$FullName.git"
      Assert-ExitCode 'git remote add origin'
    }
    git push -u origin master
    Assert-ExitCode 'git push master'
    return
  }
  gh repo create $FullName --public --description $Description --source . --remote origin --push
  Assert-ExitCode 'gh repo create'
}

function New-DevBranchIfMissing {
  Write-Step 'Branch dev'
  git ls-remote --exit-code --heads origin dev | Out-Null
  if ($LASTEXITCODE -ne 0) {
    git push origin master:refs/heads/dev
    Assert-ExitCode 'git push dev'
  }
  else {
    Write-Host 'Already exists on origin.'
  }
  git fetch origin --quiet
  Assert-ExitCode 'git fetch'
  git show-ref --verify --quiet refs/heads/dev
  if ($LASTEXITCODE -ne 0) {
    git branch --track dev origin/dev
    Assert-ExitCode 'git branch dev'
  }
}

function Set-RepositorySettings([string]$FullName) {
  Write-Step 'Default branch and merge settings'
  gh repo edit $FullName --default-branch dev --enable-squash-merge --enable-merge-commit `
    --enable-rebase-merge=false --delete-branch-on-merge
  Assert-ExitCode 'gh repo edit'

  # Squash commit = PR title + PR body, so a Conventional Commit PR title becomes the commit on dev.
  gh api -X PATCH "repos/$FullName" -f squash_merge_commit_title=PR_TITLE `
    -f squash_merge_commit_message=PR_BODY --silent
  Assert-ExitCode 'squash commit message settings'
}

function New-RulesetBody([string]$Name, [string]$Branch, [string[]]$MergeMethods) {
  $rules = @(
    @{ type = 'deletion' },
    @{ type = 'non_fast_forward' },
    @{
      type       = 'pull_request'
      parameters = @{
        required_approving_review_count   = 0
        dismiss_stale_reviews_on_push     = $false
        require_code_owner_review         = $false
        require_last_push_approval        = $false
        required_review_thread_resolution = $false
        allowed_merge_methods             = $MergeMethods
      }
    }
  )
  if ($RequiredStatusChecks.Count -gt 0) {
    $rules += @{
      type       = 'required_status_checks'
      parameters = @{
        strict_required_status_checks_policy = $false
        required_status_checks               = @($RequiredStatusChecks | ForEach-Object { @{ context = $_ } })
      }
    }
  }
  return @{
    name          = $Name
    target        = 'branch'
    enforcement   = 'active'
    bypass_actors = @()
    conditions    = @{ ref_name = @{ include = @("refs/heads/$Branch"); exclude = @() } }
    rules         = $rules
  }
}

function Set-BranchRuleset([string]$FullName, [string]$Branch, [string[]]$MergeMethods) {
  $name = "protect-$Branch"
  Write-Step "Ruleset $name (merge: $($MergeMethods -join ', '))"
  $body = New-RulesetBody -Name $name -Branch $Branch -MergeMethods $MergeMethods
  $existingId = gh api "repos/$FullName/rulesets" --jq ".[] | select(.name == `"$name`") | .id"
  Assert-ExitCode 'list rulesets'
  if ($existingId) {
    Invoke-GhApiJson -Method PUT -Endpoint "repos/$FullName/rulesets/$existingId" -Body $body
    Write-Host 'Updated.'
  }
  else {
    Invoke-GhApiJson -Method POST -Endpoint "repos/$FullName/rulesets" -Body $body
    Write-Host 'Created.'
  }
}

function Enable-PagesWithActions([string]$FullName) {
  Write-Step 'GitHub Pages (source: GitHub Actions)'
  if (Test-GhApi "repos/$FullName/pages") {
    gh api -X PUT "repos/$FullName/pages" -f build_type=workflow --silent
    Assert-ExitCode 'update pages'
    Write-Host 'Already enabled, source set to GitHub Actions.'
  }
  else {
    gh api -X POST "repos/$FullName/pages" -f build_type=workflow --silent
    Assert-ExitCode 'enable pages'
    Write-Host 'Enabled.'
  }
}

function Set-PagesEnvironmentBranch([string]$FullName, [string]$Branch) {
  # The default branch is dev, but production deploys run from master:
  # the github-pages environment must explicitly allow it.
  Write-Step "Environment github-pages: allow deploys from $Branch"
  $envEndpoint = "repos/$FullName/environments/github-pages"
  Invoke-GhApiJson -Method PUT -Endpoint $envEndpoint -Body @{
    deployment_branch_policy = @{ protected_branches = $false; custom_branch_policies = $true }
  }
  $policies = gh api "$envEndpoint/deployment-branch-policies" --jq '.branch_policies[].name'
  Assert-ExitCode 'list deployment branch policies'
  if ($policies -contains $Branch) {
    Write-Host 'Already allowed.'
    return
  }
  gh api -X POST "$envEndpoint/deployment-branch-policies" -f name=$Branch -f type=branch --silent
  Assert-ExitCode 'add deployment branch policy'
  Write-Host 'Allowed.'
}

try {
  Assert-Prerequisites
  $fullName = Get-RepoFullName
  New-RepositoryIfMissing -FullName $fullName
  New-DevBranchIfMissing
  Set-RepositorySettings -FullName $fullName
  Set-BranchRuleset -FullName $fullName -Branch 'master' -MergeMethods @('merge')
  Set-BranchRuleset -FullName $fullName -Branch 'dev' -MergeMethods @('squash')
  Enable-PagesWithActions -FullName $fullName
  Set-PagesEnvironmentBranch -FullName $fullName -Branch 'master'
  Write-Host "`nDone: https://github.com/$fullName" -ForegroundColor Green
}
catch {
  Write-Host "`nERROR: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
