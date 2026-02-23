#!/usr/bin/env python3
"""
Bloom CDK App — single-stack deployment for MLP.

Usage:
    cd infra
    pip install -r requirements.txt
    cdk bootstrap          # first time only
    cdk deploy             # deploy everything
    cdk destroy            # tear it all down
"""

import aws_cdk as cdk
from bloom_stack import BloomStack

app = cdk.App()

BloomStack(
    app,
    "BloomStack",
    env=cdk.Environment(
        # Uses your default AWS CLI profile region/account.
        # Override with: cdk deploy --profile <name>
        account=None,
        region="us-east-1",
    ),
    description="Bloom floral subscription platform — MLP infrastructure",
)

app.synth()
