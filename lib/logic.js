/**
 * Register a property for sale by creating a salelisting for it
 * @param {org.acme.biznet.RegisterForSale} registerForSale - the registerForSale transaction
 * @transaction
 */
function registerForSale(registerForSale){
    
        let listing = null;
        let factory = getFactory();
    
        return getAssetRegistry('org.acme.biznet.PropertySaleListing')
        .then((propertySaleListingRegistry) => {
            return propertySaleListingRegistry.getAll();
        })
        .then((listings) => {
    
            //handle if sale listing already exists
            for (let i = 0; i< listings.length ; i++){
                if (listings[i].propertyOnSale == registerForSale.property){
                    throw new Error('Sale Listing for this property exists. Transaction aborted.')
                }
            }
    
            //check if transaction executor has rights to sell property
            if (listing.propertyOnSale.currentOwner != registerForSale.property.currentOwner){ //or !==?
                throw new Error('You do not have rights to sell this property since you are not the owner. Transaction aborted');
            }
    
            //create new sale listing
            let newID = listings.length + 1;
            listing = factory.newResource('org.acme.biznet', 'PropertySaleListing', newID.toString());
            listing.askingPrice = registerForSale.askingPrice;
            listing.state = 'FOR_SALE';
            listing.propertyOnSale = registerForSale.property
    
            return getAssetRegistry('org.acme.biznet.PropertySaleListing');
        })
        .then((propertySaleListingRegistry) => {
            //add new sale listing to asset registry
            return propertySaleListingRegistry.add(listing);
        })
    }