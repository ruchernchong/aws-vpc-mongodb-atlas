# AWS VPC for MongoDB Atlas

This repository is a proof of concept for creating a VPC on AWS and using MongoDB Atlas Private Link to establish a secured connection between the two infrastructures.

## Overview

The infrastructure is designed to support a serverless instance on MongoDB Atlas. Stacks included are:

- VPC and Subnets
- Internet Gateway
- Route Table
- Security Group
- Lambda Function (primarily for testing database connection, writing, and reading)
- IAM Role and Policies

## Prerequisites

Ensure the following prerequisites are properly set up:

- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [Node.js](https://nodejs.org/)
- AWS credentials
- MongoDB Serverless Instance
