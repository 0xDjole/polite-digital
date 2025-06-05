terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4"
    }
  }
}
