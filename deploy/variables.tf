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

variable "PUBLIC_BUSINESS_ID" {
  description = "Business ID for the website"
  type        = string
  default     = "4429b3d1-e12f-43d4-8232-62da8ae3da85"
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

variable "API_ENDPOINT" {
  description = "Full API endpoint URL"
  type        = string
}

variable "STORAGE_ENDPOINT" {
  description = "Full storage endpoint URL"
  type        = string
}




