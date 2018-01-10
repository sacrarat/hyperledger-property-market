/**
 * Register a property for sale by creating a salelisting for it
 * @param {org.acme.biznet.RegisterForSale} registerForSale - the registerForSale transaction
 * @transaction
 */
function registerForSale(registerForSale){
    
        var listing = null;
        var factory = getFactory();
    
        return getAssetRegistry('org.acme.biznet.PropertySaleListing')
        .then(function (propertySaleListingRegistry){
            return propertySaleListingRegistry.getAll();
        })
        .then(function (listings) {
    
            //handle if sale listing already exists
            for (var i = 0; i< listings.length ; i++){
                //console.log("listing[i]" + listings[i].propertyOnSale);
                if (listings[i].propertyOnSale == registerForSale.property){
                    throw new Error('Sale Listing for this property exists. Transaction aborted.')
                }
            }

            //console.log("seller" + registerForSale.seller);
            //console.log("owner" + registerForSale.property.currentOwner);
    
            //check if transaction executor has rights to sell property
            if (registerForSale.seller != registerForSale.property.currentOwner){ //or !==?
                throw new Error('You do not have rights to sell this property since you are not the owner. Transaction aborted');
            }
    
            //create new sale listing
            var newID = listings.length + 1;
            listing = factory.newResource('org.acme.biznet', 'PropertySaleListing', newID.toString());
            listing.askingPrice = registerForSale.askingPrice;
            listing.state = 'FOR_SALE';
            listing.propertyOnSale = registerForSale.property;
            listing.seller = registerForSale.seller;
    
            return getAssetRegistry('org.acme.biznet.PropertySaleListing');
        })
        .then(function (propertySaleListingRegistry) {
            //add new sale listing to asset registry
            return propertySaleListingRegistry.add(listing);
        })
    }