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
        //not working for some reason
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

/**
 * Completing a sale of a property
 * @param {org.acme.biznet.ConfirmPropertySale} confirmPropertySale - the confirmPropertySale transaction
 * @transaction
 */
function confirmPropertySale(confirmPropertySale){

    var saleAgreement = null;
    var factory = getFactory();
    var id = guid();

    return getAssetRegistry('org.acme.biznet.SaleAgreement')
    .then(function (saleAgreementRegistry){

        //check if buyer has sufficient funds
        if (confirmPropertySale.buyer.availableFunds < confirmPropertySale.listing.askingPrice){
            throw new Error('Insufficient funds. Transaction aborted.');
        }

        //create and add a new sale agreement to the registry
        saleAgreement = factory.newResource('org.acme.biznet', 'SaleAgreement', id);
        saleAgreement.buyer = confirmPropertySale.buyer;
        saleAgreement.listing = confirmPropertySale.listing;
        return saleAgreementRegistry.add(saleAgreement);        
    })
    .then(function(){
        return getAssetRegistry('org.acme.biznet.Property');
    })
    .then(function (propertyRegistry){
        //update the current and past owners of the property
        var currentOwner = confirmPropertySale.listing.propertyOnSale.currentOwner;
        confirmPropertySale.listing.propertyOnSale.pastOwners.push(currentOwner);        
        currentOwner = confirmPropertySale.buyer;
        return propertyRegistry.update(confirmPropertySale.listing.propertyOnSale);
    })
    .then(function(){
        return getAssetRegistry('org.acme.biznet.PropertySaleListing');
    })
    .then(function(propertySaleListingRegistry){
        //update state for the sale listing
        confirmPropertySale.listing.state = 'SOLD';
        return propertySaleListingRegistry.update(confirmPropertySale.listing);
    })
    .then(function (){
        return getAssetRegistry('org.acme.biznet.Person');
    })
    .then(function(personRegistry){
        //update available funds for buyer and seller
        var cost = confirmPropertySale.listing.askingPrice;
        var buyer = confirmPropertySale.buyer;
        var seller = confirmPropertySale.listing.seller;
        buyer.availableFunds -= cost;
        seller.availableFunds += cost;
        return getAssetRegistry.updateAll([buyer, seller]);
    })
    
}

//generates a unique id
function guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  }