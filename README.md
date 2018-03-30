# Property Market Network

> This defines a business network in which participants may trade properties and apply for mortgages to support them.


## Deployment 

To deploy and run the defined business network model, there are two main ways – locally on a local deployed instance of the Hyperledger Fabric or online on the Hyperledger Composer Playground.

### Online

A straightforward way to test and play around with your business network model is in the Hyperledger Composer Web Playground at:
https://composer-playground.mybluemix.net/login

Here you can upload your business network archive file and test it!

### Local

First set up your development environment by following the steps at https://hyperledger.github.io/composer/latest/installing/development-tools.html

Next you can run the following commands in terminal to deploy your business network model:
1.	Tear down any old instances of Hyperledger Fabric by running the following shell script available in the fabric tools downloaded during the development environment setup:

```./teardownFabric.sh```

2.	Start a new instance of Hyperledger Fabric using the following script in fabric tools:

```./startFabric.sh ```

3.	Create a new Peer Admin card used to connect to the Hyperledger Fabric using the following script in fabric tools:

```./createPeerAdminCard.sh```

4.	Install the composer runtime with the business network:

```composer runtime install --card PeerAdmin@hlfv1 --businessNetworkName tutorial-network```

5.	Start the network on the composer runtime:

```composer network start --card PeerAdmin@hlfv1 --networkAdmin admin --networkAdminEnrollSecret adminpw --archiveFile tutorial-network@0.0.1.bna --file networkadmin.card```

Note: Take note of the naming for the “card” and the “archiveFile” and make sure it matches if changes are made to naming.

And your business network is deployed on a local instance of the Hyperledger Fabric!

6.	To play around with the business network a REST server can be started with the following command:

```composer-rest-server```

7.	After making changes to the business model, you can create a new business network archive with the following command:

```composer archive create --sourceType dir --sourceName . -a tutorial-network@0.0.1.bna```

8.	Then update the network deployed:

```composer network update -a tutorial-network@0.0.1.bna -c admin@tutorial-network```

Note: Take care of naming and replace according to the business network cards and archives you’re working with.





