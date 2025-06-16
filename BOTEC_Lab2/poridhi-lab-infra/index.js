const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

// Create a VPC
const vpc = new aws.ec2.Vpc("poridhi-vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsSupport: true,
    enableDnsHostnames: true,
    tags: {
        Name: "poridhi-vpc",
    },
});

// Create an Internet Gateway
const internetGateway = new aws.ec2.InternetGateway("poridhi-igw", {
    vpcId: vpc.id,
});

// Create a Public Subnet
const subnet = new aws.ec2.Subnet("poridhi-subnet", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    mapPublicIpOnLaunch: true,
});

// Create a route table
const routeTable = new aws.ec2.RouteTable("poridhi-route-table", {
    vpcId: vpc.id,
    routes: [{
        cidrBlock: "0.0.0.0/0",
        gatewayId: internetGateway.id,
    }],
});

// Associate the subnet with the route table
const routeTableAssociation = new aws.ec2.RouteTableAssociation("poridhi-rt-association", {
    subnetId: subnet.id,
    routeTableId: routeTable.id,
});

// Security Group allowing all inbound and outbound traffic
const securityGroup = new aws.ec2.SecurityGroup("poridhi-security-group", {
    description: "Security group allowing all traffic",
    vpcId: vpc.id,
    ingress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
    egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
});

// Create the EC2 instance
const nodejsServerInstance = new aws.ec2.Instance("nodejs_server_instance", {
    instanceType: "t3.medium",
    ami: "ami-01811d4912b4ccb26",
    vpcSecurityGroupIds: [securityGroup.id],
    subnetId: subnet.id,
    keyName: "key-pair-poridhi-poc",
    tags: {
        Name: "nodejs_server_instance",
    },
});

// Output the public IP address
exports.nodejs_server_instance_public_ip = nodejsServerInstance.publicIp;