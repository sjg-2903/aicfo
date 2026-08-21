# AI CFO Frontend - Deployment Guide

This guide covers deployment of the AI CFO frontend to AWS S3 and CloudFront for production.

## Architecture Overview

```
┌─────────────────┐
│   Your Browser  │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────┐
│   CloudFront CDN    │ (Edge locations)
├─────────────────────┤
│ • Caching          │
│ • Compression      │
│ • SSL/TLS          │
│ • DDoS Protection  │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   S3 Bucket         │ (Origin)
├─────────────────────┤
│ • index.html        │
│ • CSS/JS bundles   │
│ • Static assets    │
└─────────────────────┘

┌─────────────────────┐
│  FastAPI Backend    │ (Separate deployment)
│  /api/...           │
└─────────────────────┘
```

## Prerequisites

- AWS Account with appropriate IAM permissions
- AWS CLI installed and configured
- Vite production build completed
- Domain name (optional, for custom domain)

## Step-by-Step Deployment

### 1. Build the Application

```bash
npm run build
```

This generates optimized production files in the `dist/` directory:
- `dist/index.html` - Main entry point (single file due to vite-plugin-singlefile)
- All CSS and JavaScript are inlined

### 2. Create S3 Bucket

```bash
# Create bucket (replace with your desired bucket name)
aws s3 mb s3://ai-cfo-frontend-prod --region us-east-1

# Block public access (important for security)
aws s3api put-public-access-block \
  --bucket ai-cfo-frontend-prod \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning for rollback capability
aws s3api put-bucket-versioning \
  --bucket ai-cfo-frontend-prod \
  --versioning-configuration Status=Enabled
```

### 3. Configure S3 Bucket Policy

Create a bucket policy to allow CloudFront access only:

```bash
# Create policy document
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFront",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::ai-cfo-frontend-prod/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
EOF

# Apply the policy
aws s3api put-bucket-policy --bucket ai-cfo-frontend-prod --policy file://bucket-policy.json
```

### 4. Upload Build Files to S3

```bash
aws s3 sync dist/ s3://ai-cfo-frontend-prod --delete --cache-control "max-age=31536000,immutable" --exclude "index.html"

# Upload index.html with cache-control for HTML
aws s3 cp dist/index.html s3://ai-cfo-frontend-prod/index.html --cache-control "max-age=0,must-revalidate" --content-type "text/html"

# Verify upload
aws s3 ls s3://ai-cfo-frontend-prod/
```

### 5. Create CloudFront Distribution

#### Option A: Using AWS Console (Recommended for first-time setup)

1. Go to CloudFront console
2. Click "Create distribution"
3. **Origin settings:**
   - Origin domain: `ai-cfo-frontend-prod.s3.us-east-1.amazonaws.com`
   - Origin type: S3
   - Origin access: Origin access control (OAC)
   - Create new OAC
   - Protocol: HTTPS only

4. **Default cache behavior:**
   - Allowed HTTP methods: GET, HEAD, OPTIONS
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Cache policy: Managed-CachingOptimized
   - Compress objects automatically: Yes
   - Query string forwarding: None

5. **Additional settings:**
   - Default root object: `index.html`
   - Enable logging: Yes (optional)
   - Standard logging settings

6. **Create distribution**

#### Option B: Using AWS CLI

```bash
# Create CloudFront distribution configuration
cat > cloudfront-config.json << 'EOF'
{
  "CallerReference": "aicfo-frontend-prod-$(date +%s)",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3Origin",
        "DomainName": "ai-cfo-frontend-prod.s3.us-east-1.amazonaws.com",
        "S3OriginConfig": {},
        "OriginAccessIdentity": "origin-access-identity/cloudfront/YOUR_OAI_ID"
      }
    ]
  },
  "DefaultCacheBehavior": {
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "Compress": true,
    "ViewerProtocolPolicy": "redirect-to-https",
    "TargetOriginId": "S3Origin"
  },
  "Enabled": true,
  "Comment": "AI CFO Frontend Distribution"
}
EOF

# Create distribution
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

### 6. Configure SPA Routing (Critical for React Router)

CloudFront must redirect 404 errors to `index.html` for proper React Router handling:

```bash
# Using AWS Console:
# 1. Select your distribution
# 2. Go to Error pages
# 3. Create custom error response:
#    - HTTP Error Code: 404
#    - Customize error response: Yes
#    - Response page path: /index.html
#    - HTTP Response Code: 200
#    - TTL: 300

# Using AWS CLI:
cat > error-response.json << 'EOF'
{
  "ErrorCode": 404,
  "ResponsePagePath": "/index.html",
  "ResponseCode": "200",
  "ErrorCachingMinTTL": 300
}
EOF

# Note: Update via console or use AWS SDK for CLI
```

### 7. Configure Custom Domain (Optional)

```bash
# In Route 53, create record:
# - Name: aicfo.yourdomain.com
# - Type: A
# - Alias: Yes
# - Alias to: CloudFront distribution domain

# For HTTPS, request certificate from ACM:
aws acm request-certificate \
  --domain-name aicfo.yourdomain.com \
  --validation-method DNS \
  --subject-alternative-names www.aicfo.yourdomain.com

# Validate DNS and attach to CloudFront distribution
```

### 8. Configure Environment Variables

Update CloudFront distribution to inject environment variables:

```bash
# Using AWS Lambda@Edge to inject environment (advanced)
# Or configure in dist/config.js and update before deployment

# Update .env for production
cat > .env.production << 'EOF'
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_ENV=production
EOF

npm run build
aws s3 sync dist/ s3://ai-cfo-frontend-prod --delete
```

### 9. Invalidate CloudFront Cache

After deployment, invalidate the cache:

```bash
# Invalidate all files
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"

# Invalidate specific files
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/index.html" "/styles.css"
```

## Deployment Checklist

- [ ] Build completes without errors
- [ ] All environment variables configured
- [ ] S3 bucket created and configured
- [ ] Bucket policy configured for CloudFront only
- [ ] CloudFront distribution created
- [ ] Error 404 → index.html routing configured
- [ ] Custom domain (if applicable) configured
- [ ] SSL/TLS certificate configured
- [ ] Cache headers properly configured
- [ ] Files uploaded to S3
- [ ] CloudFront cache invalidated
- [ ] Testing in production environment
- [ ] Monitoring and logging enabled

## Production Monitoring

### CloudWatch Metrics

```bash
# View CloudFront metrics
aws cloudwatch list-metrics --namespace AWS/CloudFront

# Create alarms
aws cloudwatch put-metric-alarm \
  --alarm-name ErrorRate \
  --alarm-description "Alert on high error rate" \
  --metric-name 4xxErrorRate \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 60 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

### CloudFront Logs

Enable CloudFront logging to S3:

```bash
# Create logging bucket
aws s3 mb s3://aicfo-cloudfront-logs --region us-east-1

# Enable logging in CloudFront distribution
# (Done through console or SDK)
```

## Rollback Procedure

If there's an issue with the deployment:

```bash
# Option 1: Restore from S3 versioning
aws s3api list-object-versions --bucket ai-cfo-frontend-prod

# Option 2: Redeploy from previous build
git checkout previous-commit
npm run build
aws s3 sync dist/ s3://ai-cfo-frontend-prod --delete

# Option 3: Create new distribution pointing to previous version
```

## Performance Optimization

### Cache Configuration

```bash
# Long-term caching for versioned assets
aws s3 sync dist/ s3://ai-cfo-frontend-prod \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.json"

# No caching for HTML
aws s3 cp dist/index.html s3://ai-cfo-frontend-prod/index.html \
  --cache-control "public, max-age=0, must-revalidate"
```

### Enable Gzip Compression

CloudFront automatically compresses files when:
- Viewer accepts gzip (Accept-Encoding header)
- Object is eligible (CSS, JS, JSON, etc.)
- Object is > 1KB

This is typically enabled by default.

### Enable HTTP/2

HTTP/2 is enabled by default on CloudFront distributions.

## Monitoring & Alerts

### Key Metrics to Monitor

1. **4xx Errors** - Client errors, including 404 routing issues
2. **5xx Errors** - Server errors (backend issues)
3. **Cache Hit Ratio** - Percentage of requests served from cache
4. **Origin Latency** - Time to fetch from S3
5. **Bytes Downloaded** - Data transfer (cost indicator)

### Setting up Alerts

```bash
# Alert on high 4xx rate
aws cloudwatch put-metric-alarm \
  --alarm-name CloudFront4xxErrors \
  --alarm-description "High 4xx error rate" \
  --metric-name 4xxErrorRate \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 300 \
  --threshold 2 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:YourSNSTopic
```

## Cost Optimization

### Estimated Monthly Costs

- **S3 Storage**: ~$0.023/GB (minimal)
- **CloudFront Data Transfer Out**: ~$0.085/GB
- **CloudFront Requests**: $0.0075 per 10,000 requests

For 1M users/month with 100KB average page size:
- Data transfer: 100GB × $0.085 = $8.50
- Requests: 1M × $0.0075/10K = $0.75
- Total: ~$10/month

### Cost Reduction Tips

1. **Enable compression** - Reduces data transfer by 70-80%
2. **Cache aggressively** - Reduce origin requests
3. **Use CloudFront geographic restrictions** - Block unnecessary regions
4. **Monitor and clean up** - Remove old versions from S3

## SSL/TLS Configuration

### Self-Signed Certificate (Development)

```bash
# AWS Certificate Manager provides free SSL/TLS
aws acm request-certificate \
  --domain-name aicfo.yourdomain.com \
  --subject-alternative-names www.aicfo.yourdomain.com
```

### Automatic Certificate Renewal

AWS ACM handles automatic renewal at no additional cost.

## Security Best Practices

1. **Bucket policies** - Allow S3 access only from CloudFront OAC
2. **Public access block** - Block all public access to S3
3. **HTTPS only** - Redirect all HTTP to HTTPS
4. **Security headers** - Configure via CloudFront or Lambda@Edge

### Add Security Headers (Lambda@Edge)

```python
# Lambda@Edge function to add security headers
def lambda_handler(event, context):
    response = event['Records'][0]['cf']['response']
    headers = response['headers']
    
    headers['strict-transport-security'] = [{
        'key': 'Strict-Transport-Security',
        'value': 'max-age=31536000; includeSubDomains'
    }]
    headers['x-content-type-options'] = [{
        'key': 'X-Content-Type-Options',
        'value': 'nosniff'
    }]
    headers['x-frame-options'] = [{
        'key': 'X-Frame-Options',
        'value': 'SAMEORIGIN'
    }]
    
    return response
```

## Troubleshooting

### 404 on Page Refresh

**Problem**: SPA routes return 404 after refresh
**Solution**: Ensure CloudFront error page configuration redirects 404 to index.html

```bash
# Verify configuration
aws cloudfront get-distribution-config --id YOUR_DISTRIBUTION_ID
```

### Cache Not Updating

**Problem**: Old content still showing after deployment
**Solution**: Invalidate CloudFront cache

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"

# Check invalidation status
aws cloudfront list-invalidations --distribution-id YOUR_DISTRIBUTION_ID
```

### Slow Performance

**Problem**: Pages loading slowly
**Solution**: Check cache hit ratio and compression settings

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 86400 \
  --statistics Average
```

### CORS Errors

**Problem**: Frontend can't reach backend API
**Solution**: Ensure backend CORS configuration allows frontend domain

On backend (FastAPI):
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://aicfo.yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Automated Deployment (CI/CD)

### GitHub Actions Example

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to S3
        run: |
          aws s3 sync dist/ s3://ai-cfo-frontend-prod --delete
      
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

## Maintenance

### Regular Tasks

- [ ] Monitor CloudFront metrics weekly
- [ ] Review and optimize cache policies monthly
- [ ] Update security certificates (AWS ACM handles this)
- [ ] Review S3 versions and clean up old versions
- [ ] Check cost optimization opportunities
- [ ] Test disaster recovery/rollback procedures

## Support & Additional Resources

- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [React Router SPA Deployment](https://reactrouter.com/en/main/start/deployment)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

---

**Last Updated**: 2024
**Status**: Production Ready
