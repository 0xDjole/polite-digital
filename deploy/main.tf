locals {
  ADMIN_DOMAIN      = "admin.${var.ROOT_DOMAIN}"
  DATA_ADMIN_DOMAIN = "data.${var.ROOT_DOMAIN}"
}

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}

# Website (Astro) deployment with Git integration
resource "cloudflare_pages_project" "polite_website" {
  account_id        = var.CLOUDFLARE_ACCOUNT_ID
  name              = "polite-digital"
  production_branch = "master"

  # Git integration
  source {
    type = "github"
    config {
      owner                         = var.GITHUB_OWNER
      repo_name                     = "polite-digital"
      production_branch             = "master"
      pr_comments_enabled           = true
      deployments_enabled           = true
      production_deployment_enabled = true
    }
  }

  # Build configuration
  build_config {
    build_command   = "npm run build"
    destination_dir = "dist"
    root_dir        = "website"
  }

  deployment_configs {
    production {
      environment_variables = {
        PUBLIC_API_URL       = var.API_ENDPOINT
        PUBLIC_BUSINESS_ID   = var.PUBLIC_BUSINESS_ID
        PUBLIC_CLIENT_DOMAIN = "https://${local.ADMIN_DOMAIN}"
        PUBLIC_STORAGE_URL   = var.STORAGE_ENDPOINT
        PUBLIC_SITE_URL      = "https://${var.ROOT_DOMAIN}"
      }
    }
  }
}

# Pages will now auto-deploy from GitHub on every push to master

resource "cloudflare_pages_domain" "polite_website_domain" {
  account_id   = var.CLOUDFLARE_ACCOUNT_ID
  project_name = cloudflare_pages_project.polite_website.name
  domain       = var.ROOT_DOMAIN
}

resource "cloudflare_record" "polite_website_domain" {
  zone_id = var.CLOUDFLARE_ZONE_ID
  name    = var.ROOT_DOMAIN
  content = "${cloudflare_pages_project.polite_website.name}.pages.dev"
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

resource "cloudflare_record" "polite_website_www_cname" {
  zone_id = var.CLOUDFLARE_ZONE_ID
  name    = "www.${var.ROOT_DOMAIN}"
  content = var.ROOT_DOMAIN
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

