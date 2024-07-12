"use strict";
const index = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

// Define the AWS region
const PROJECT_NAME = index.getProject();
const config = new index.Config();
const AWS_REGION = config.require("AWS_REGION");
const MONGODB_URI = config.require("MONGODB_URI");

// Create a new VPC
const vpc = new aws.ec2.Vpc(`${PROJECT_NAME}-vpc`, {
  cidrBlock: "10.0.0.0/16",
  tags: {
    Name: `${PROJECT_NAME}-vpc`,
  },
});

// Create subnets
const subnetA = new aws.ec2.Subnet(`${PROJECT_NAME}-subnetA`, {
  vpcId: vpc.id,
  cidrBlock: "10.0.1.0/24",
  availabilityZone: `${AWS_REGION}a`,
  tags: {
    Name: `${PROJECT_NAME}-subnetA`,
  },
});

const subnetB = new aws.ec2.Subnet(`${PROJECT_NAME}-subnetB`, {
  vpcId: vpc.id,
  cidrBlock: "10.0.2.0/24",
  availabilityZone: `${AWS_REGION}b`,
  tags: {
    Name: `${PROJECT_NAME}-subnetB`,
  },
});

// Create an Internet Gateway
const internetGateway = new aws.ec2.InternetGateway(
  `${PROJECT_NAME}-internetGateway`,
  {
    vpcId: vpc.id,
    tags: {
      Name: `${PROJECT_NAME}-internetGateway`,
    },
  },
);

// Create a route table
const routeTable = new aws.ec2.RouteTable(`${PROJECT_NAME}-routeTable`, {
  vpcId: vpc.id,
  routes: [
    {
      cidrBlock: "0.0.0.0/0",
      gatewayId: internetGateway.id,
    },
  ],
  tags: {
    Name: `${PROJECT_NAME}-route-table`,
  },
});

// Associate the route table with the subnets
new aws.ec2.RouteTableAssociation(`${PROJECT_NAME}-rta-subnetA`, {
  subnetId: subnetA.id,
  routeTableId: routeTable.id,
});

new aws.ec2.RouteTableAssociation(`${PROJECT_NAME}-rta-subnetB`, {
  subnetId: subnetB.id,
  routeTableId: routeTable.id,
});

// Create a security group for the Lambda function
const lambdaSecurityGroup = new aws.ec2.SecurityGroup(
  `${PROJECT_NAME}-lambda-security-group`,
  {
    description: "Security group for Lambda function",
    vpcId: vpc.id,
    ingress: [
      {
        protocol: "tcp",
        fromPort: 443,
        toPort: 443,
        cidrBlocks: ["0.0.0.0/0"],
      },
    ],
    egress: [
      {
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
      },
    ],
    tags: {
      Name: `${PROJECT_NAME}-lambda-security-group`,
    },
  },
);

const assumeRole = aws.iam.getPolicyDocument({
  statements: [
    {
      effect: "Allow",
      principals: [
        {
          type: "Service",
          identifiers: ["lambda.amazonaws.com"],
        },
      ],
      actions: ["sts:AssumeRole"],
    },
  ],
});

const lambdaVPCPolicy = new aws.iam.Policy(`${PROJECT_NAME}-vpc-policy`, {
  description: "IAM policy for Lambda function VPC access",
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
          "ec2:AssignPrivateIpAddresses",
          "ec2:UnassignPrivateIpAddresses",
        ],
        Resource: "*",
      },
    ],
  }),
});

const lambdaRole = new aws.iam.Role(`${PROJECT_NAME}-role`, {
  assumeRolePolicy: assumeRole.then((assumeRole) => assumeRole.json),
});

new aws.iam.RolePolicyAttachment(`${PROJECT_NAME}-vpc-policy-attachment`, {
  role: lambdaRole.name,
  policyArn: lambdaVPCPolicy.arn,
});

// Attach AWSLambdaBasicExecutionRole
new aws.iam.RolePolicyAttachment(
  `${PROJECT_NAME}-lambda-basic-execution-policy-attachment`,
  {
    role: lambdaRole.name,
    policyArn:
      "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
  },
);

// Create an AssetArchive for the Lambda function
const lambdaAsset = new index.asset.AssetArchive({
  ".": new index.asset.FileArchive("./"),
});

const lambdaFunction = new aws.lambda.Function(`${PROJECT_NAME}-function`, {
  code: lambdaAsset,
  name: `${PROJECT_NAME}-function`,
  role: lambdaRole.arn,
  handler: "lambda.handler",
  runtime: aws.lambda.Runtime.NodeJS18dX,
  environment: {
    variables: {
      MONGODB_URI: MONGODB_URI,
    },
  },
  vpcConfig: {
    securityGroupIds: [lambdaSecurityGroup.id],
    subnetIds: [subnetA.id, subnetB.id],
  },
});

// Export the IDs of the created resources
exports.vpcId = vpc.id;
exports.subnetAId = subnetA.id;
exports.subnetBId = subnetB.id;
exports.securityGroupId = lambdaSecurityGroup.id;
exports.functionName = lambdaFunction.name;
