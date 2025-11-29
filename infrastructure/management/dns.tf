resource "aws_route53_zone" "main" {
  name = "printuj.me"
  lifecycle {
    prevent_destroy = true
  }
}

# 1. The MX Records (Mail Exchange)
resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "printuj.me"
  type    = "MX"
  ttl     = "60"
  
  # COPY THESE EXACTLY FROM YOUR CONSOLE
  records = [
    "10 mx.zoho.eu",
    "20 mx2.zoho.eu",
    "50 mx3.zoho.eu"
  ]
}

# 2. The SPF Record (TXT)
resource "aws_route53_record" "spf" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "printuj.me"
  type    = "TXT"
  ttl     = "60"
  
  # COPY EXACTLY FROM CONSOLE (Watch out for quotes!)
  records = [
    "v=spf1 include:zohomail.eu ~all"
  ]
}

# 3. The DKIM Record (CNAME or TXT - usually TXT for Zoho)
# You likely have a weird name like "zmail._domainkey"
resource "aws_route53_record" "dkim" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "zmail._domainkey.printuj.me" # Check your console for the actual prefix
  type    = "TXT"
  ttl     = "60"
  
  records = [
    "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCVobXRgyGZm4eVIUWvtfGMCJKUhffUA2SRjRB1eca4SI+X5SBEVB2enrq0iNfj7ai0TbpZmtpvh5vlOxqwcV4adDMI40ovimSV4R/WnJwOwQpr5hDzdqqnDWhtm+Ya3MPID6d7tXpXTYI+s68pM8FGZHtwnl4vT7B0FNXoV32ewQIDAQAB"
  ]
}