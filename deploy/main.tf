terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4"
    }
  }
}

resource "cloudflare_pages_project" "polite_website" {
  account_id        = var.CLOUDFLARE_ACCOUNT_ID
  name              = var.GITHUB_REPO
  production_branch = "master"

  source {
    type = "github"
    config {
      owner                         = var.GITHUB_OWNER
      repo_name                     = var.GITHUB_REPO
      production_branch             = "master"
      pr_comments_enabled           = true
      deployments_enabled           = true
      production_deployment_enabled = true
    }
  }

  build_config {
    build_command   = "npm run build"
    destination_dir = "dist"
  }

  deployment_configs {
    production {
      environment_variables = {
        PUBLIC_ENVIRONMENT = "prod"
      }
    }
    preview {
      environment_variables = {
        PUBLIC_ENVIRONMENT = "prod"
      }
    }
  }
}

resource "cloudflare_pages_domain" "polite_website_domain" {
  account_id   = var.CLOUDFLARE_ACCOUNT_ID
  project_name = cloudflare_pages_project.polite_website.name
  domain       = var.ROOT_DOMAIN
}

resource "cloudflare_record" "polite_website_domain" {
  zone_id = var.CLOUDFLARE_ZONE_ID
  name    = var.ROOT_DOMAIN
  content = cloudflare_pages_project.polite_website.subdomain
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

