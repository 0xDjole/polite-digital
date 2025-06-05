locals {
  ADMIN_DOMAIN      = "admin.${var.ROOT_DOMAIN}"
  API_URL           = "api.${var.ROOT_DOMAIN}"
  DATA_ADMIN_DOMAIN = "data.${var.ROOT_DOMAIN}"
  STORAGE_DOMAIN    = "storage.${var.ROOT_DOMAIN}"
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

# Website (Astro) deployment
resource "cloudflare_pages_project" "yepi_website" {
  account_id        = var.CLOUDFLARE_ACCOUNT_ID
  name              = "yepi-website"
  production_branch = "master"
  deployment_configs {
    production {
      environment_variables = {
        PUBLIC_API_URL       = "https://${local.API_URL}"
        PUBLIC_BUSINESS_ID   = var.PUBLIC_BUSINESS_ID
        PUBLIC_CLIENT_DOMAIN = "https://${local.ADMIN_DOMAIN}"
        PUBLIC_STORAGE_URL   = "https://${local.STORAGE_DOMAIN}"
        PUBLIC_SITE_URL      = "https://${var.ROOT_DOMAIN}"
      }
    }
  }
}

resource "null_resource" "deploy_yepi_website" {
  triggers = {
    build_trigger = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Go to website directory
      cd ../website

      # Install dependencies
      npm install

      # Set environment variables for build
      export PUBLIC_API_URL="https://${local.API_URL}"
      export PUBLIC_BUSINESS_ID="${var.PUBLIC_BUSINESS_ID}"
      export PUBLIC_CLIENT_DOMAIN="https://${local.ADMIN_DOMAIN}"
      export PUBLIC_SITE_URL="https://${var.ROOT_DOMAIN}"
      export PUBLIC_STORAGE_URL="https://${local.STORAGE_DOMAIN}"

      # Build with environment variables
      npm run build
     
      # Set up authentication for Wrangler using API token
      echo "CLOUDFLARE_API_TOKEN=${var.CLOUDFLARE_API_TOKEN}" > .env
      
      # Deploy using Wrangler
      npx wrangler pages deploy dist --project-name=yepi-website --branch master --commit-dirty=true

    EOT
  }

  depends_on = [cloudflare_pages_project.yepi_website]
}

resource "cloudflare_pages_domain" "yepi_website_domain" {
  account_id   = var.CLOUDFLARE_ACCOUNT_ID
  project_name = cloudflare_pages_project.yepi_website.name
  domain       = var.ROOT_DOMAIN

  depends_on = [null_resource.deploy_yepi_website]
}

resource "cloudflare_record" "yepi_website_domain" {
  zone_id = var.CLOUDFLARE_ZONE_ID
  name    = var.ROOT_DOMAIN
  content = "${cloudflare_pages_project.yepi_website.name}.pages.dev"
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

resource "cloudflare_record" "yepi_website_www_cname" {
  zone_id = var.CLOUDFLARE_ZONE_ID
  name    = "www.${var.ROOT_DOMAIN}"
  content = var.ROOT_DOMAIN
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

