variable "ROOT_DOMAIN" {
  type = string
}

variable "CLOUDFLARE_API_TOKEN" {
  type = string
}

variable "CLOUDFLARE_ZONE_ID" {
  type = string
}

variable "CLOUDFLARE_ACCOUNT_ID" {
  type = string
}

variable "GITHUB_OWNER" {
  description = "GitHub username or organization"
  type        = string
}

variable "GITHUB_REPO" {
  description = "GitHub repository name"
  type        = string
  default     = "polite-digital"
}




