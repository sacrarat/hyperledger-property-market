'use strict';
/**
 * Write the unit tests for your transction processor functions here
 */

const AdminConnection = require('composer-admin').AdminConnection;
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const BusinessNetworkDefinition = require('composer-common').BusinessNetworkDefinition;
const IdCard = require('composer-common').IdCard;
const MemoryCardStore = require('composer-common').MemoryCardStore;

const path = require('path');

require('chai').should();

const namespace = 'org.acme.biznet';
const assetType = 'SampleAsset';

describe('#' + namespace, () => {
    // In-memory card store for testing so cards are not persisted to the file system
    const cardStore = new MemoryCardStore();
    let adminConnection;
    let businessNetworkConnection;

    before(() => {
        // Embedded connection used for local testing
        const connectionProfile = {
            name: 'embedded',
            type: 'embedded'
        };
        // Embedded connection does not need real credentials
        const credentials = {
            certificate: 'FAKE CERTIFICATE',
            privateKey: 'FAKE PRIVATE KEY'
        };

        // PeerAdmin identity used with the admin connection to deploy business networks
        const deployerMetadata = {
            version: 1,
            userName: 'PeerAdmin',
            roles: [ 'PeerAdmin', 'ChannelAdmin' ]
        };
        const deployerCard = new IdCard(deployerMetadata, connectionProfile);
        deployerCard.setCredentials(credentials);

        const deployerCardName = 'PeerAdmin';
        adminConnection = new AdminConnection({ cardStore: cardStore });

        return adminConnection.importCard(deployerCardName, deployerCard).then(() => {
            return adminConnection.connect(deployerCardName);
        });
    });

    beforeEach(() => {
        businessNetworkConnection = new BusinessNetworkConnection({ cardStore: cardStore });

        const adminUserName = 'admin';
        let adminCardName;
        let businessNetworkDefinition;

        return BusinessNetworkDefinition.fromDirectory(path.resolve(__dirname, '..')).then(definition => {
            businessNetworkDefinition = definition;
            // Install the Composer runtime for the new business network
            return adminConnection.install(businessNetworkDefinition.getName());
        }).then(() => {
            // Start the business network and configure an network admin identity
            const startOptions = {
                networkAdmins: [
                    {
                        userName: adminUserName,
                        enrollmentSecret: 'adminpw'
                    }
                ]
            };
            return adminConnection.start(businessNetworkDefinition, startOptions);
        }).then(adminCards => {
            // Import the network admin identity for us to use
            adminCardName = `${adminUserName}@${businessNetworkDefinition.getName()}`;
            return adminConnection.importCard(adminCardName, adminCards.get(adminUserName));
        }).then(() => {
            // Connect to the business network using the network admin identity
            return businessNetworkConnection.connect(adminCardName);
        });
    });

    describe('RegisterForSale()', () => {
        it('should create a property sale listing for the given property', () => {
            const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            // Create the property owner participant
            const owner = factory.newResource(namespace, 'Person', 'person1');
            owner.name = "james joe";
            owner.creditRating = 70.0;
            owner.availableFunds = 200000.0;

            // Create the property asset
            const property = factory.newResource(namespace, 'Property', 'property1');
            property.location = 'pokfulam';
            property.currentOwner = owner;

            // Create a transaction to create a property sale listing
            const registerForSale = factory.newTransaction(namespace, 'RegisterForSale');
            registerForSale.property = factory.newRelationship(namespace, 'Property', property.$identifier);
            registerForSale.seller = factory.newRelationship(namespace, 'Person', owner.$identifier);            
            registerForSale.saleRegistrationID = 'saleReg1';
            registerForSale.askingPrice = 50000.0;
            
            let propertyRegistry;
            let propertySaleListingRegistry;
            
            return businessNetworkConnection.getAssetRegistry(namespace + '.' + 'Property').then(registry => {
                propertyRegistry = registry;
                // Add the asset to the appropriate asset registry
                return registry.add(property);
            }).then(() => {
                return businessNetworkConnection.getParticipantRegistry(namespace + '.Person');
            }).then(personRegistry => {
                // Add the person to the appropriate participant registry
                return personRegistry.add(owner);
            }).then(() => {
                // Submit the transaction
                return businessNetworkConnection.submitTransaction(registerForSale);
            }).then(registry => {
                // Get the property sale listing asset registry
                return businessNetworkConnection.getAssetRegistry(namespace + '.' + 'PropertySaleListing');
            }).then(registry => {
                return registry.getAll();
            }).then(listings => {
                for (var i = 0; i< listings.length ; i++){
                    if (listings[i].propertyOnSale == registerForSale.property){
                        // Assert a property sale listing has been created for the given property
                        listings[i].propertyOnSale.should.equal(registerForSale.property);
                    }
                }
            });        
        });
    });

});