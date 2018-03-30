/**
 * Register a property for sale by creating a salelisting for it
 * @param {org.acme.biznet.RegisterForSale} registerForSale - the registerForSale transaction
 * @transaction
 */
function registerForSale(registerForSale){

    var listing = null;
    var factory = getFactory();
    var namespace = 'org.acme.biznet';

    return getAssetRegistry(namespace+'.PropertySaleListing')
    .then(function (propertySaleListingRegistry){
        return propertySaleListingRegistry.getAll();
    })
    .then(function (listings) {

        //handle if sale listing already exists
        // TODO not working for some reason
        for (var i = 0; i< listings.length ; i++){
            //console.log("listing[i]" + listings[i].propertyOnSale);
            if (listings[i].propertyOnSale.getFullyQualifiedIdentifier() == registerForSale.property.getFullyQualifiedIdentifier() && listings[i].state == 'FOR_SALE'){
                throw new Error('Sale Listing for this property exists. Transaction aborted.');
            }
        }

        //check if transaction executor has rights to sell property
        if (registerForSale.seller != registerForSale.property.currentOwner){ //or !==?
            throw new Error('You do not have rights to sell this property since you are not the owner. Transaction aborted');
        }

        // TODO update above execution right validation
        //could change the above execution right validation to the following once user identities figured out
        // var currentParticipant = getCurrentParticipant();
        // if (currentParticipant.getFullyQualifiedIdentifier() !== registerForSale.property.currentOwner.getFullyQualifiedIdentifier()){
        //     throw new Error('You do not have rights to sell this property since you are not the owner. Transaction aborted');            
        // }

        //create new sale listing
        var newID = guid();
        listing = factory.newResource(namespace, 'PropertySaleListing', newID.toString());
        listing.askingPrice = registerForSale.askingPrice;
        listing.state = 'FOR_SALE';
        listing.propertyOnSale = registerForSale.property;
        listing.seller = registerForSale.seller;

        return getAssetRegistry(namespace +'.PropertySaleListing');
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
    var namespace = 'org.acme.biznet';

    return getAssetRegistry(namespace +'.SaleAgreement')
    .then(function (saleAgreementRegistry){

        //check if buyer and seller are different persons
        if (confirmPropertySale.buyer.getFullyQualifiedIdentifier() == confirmPropertySale.listing.seller.getFullyQualifiedIdentifier()){
            throw new Error("Buyer and seller same. Transaction aborted.");
        }

        //check if buyer has sufficient funds
        if (confirmPropertySale.buyer.availableFunds < confirmPropertySale.listing.askingPrice){
            throw new Error('Insufficient funds. Transaction aborted.');
        }

        //check if listing is for sale
        if (confirmPropertySale.listing.state != 'FOR_SALE'){
            throw new Error('Property not for sale. Transaction aborted.');
        }

        //create and add a new sale agreement to the registry
        saleAgreement = factory.newResource(namespace, 'SaleAgreement', id);
        saleAgreement.buyer = confirmPropertySale.buyer;
        saleAgreement.listing = confirmPropertySale.listing;
        return saleAgreementRegistry.add(saleAgreement);        
    })
    .then(function(){
        return getAssetRegistry(namespace +'.Property');
    })
    .then(function (propertyRegistry){
        //update the current and past owners of the property
        var currentOwner = confirmPropertySale.listing.propertyOnSale.currentOwner;
        confirmPropertySale.listing.propertyOnSale.pastOwners.unshift(currentOwner);        
        confirmPropertySale.listing.propertyOnSale.currentOwner = confirmPropertySale.buyer;
        return propertyRegistry.update(confirmPropertySale.listing.propertyOnSale);
    })
    .then(function(){
        return getAssetRegistry(namespace +'.PropertySaleListing');
    })
    .then(function(propertySaleListingRegistry){
        //update state for the sale listing
        confirmPropertySale.listing.state = 'SOLD';
        return propertySaleListingRegistry.update(confirmPropertySale.listing);
    })
    .then(function (){
        return getParticipantRegistry(namespace +'.Person');
    })
    .then(function(personRegistry){
        //update available funds for buyer and seller
        var cost = confirmPropertySale.listing.askingPrice;
        var buyer = confirmPropertySale.buyer;
        var seller = confirmPropertySale.listing.seller;
        buyer.availableFunds -= cost;
        seller.availableFunds += cost;
        return personRegistry.updateAll([buyer, seller]);
    })
}

/**
 * Submit a valuation for a property and create a mortgage valuation asset
 * @param {org.acme.biznet.ValuateProperty} valuateProperty - the valuateProperty transaction
 * @transaction
 */
function valuateProperty(valuateProperty){

    var valuation = null;
    var factory = getFactory();
    var namespace = 'org.acme.biznet';
    var update = false;

    return getAssetRegistry(namespace+'.MortgageValuation')
    .then(function (mortgageValuationRegistry){
        return mortgageValuationRegistry.getAll();
    }).then(function (listings){
        // check if you've already created a mortgage valuation for the selected property and update if already created
        for (var i = 0; i< listings.length ; i++){
            if (listings[i].property.getFullyQualifiedIdentifier()==valuateProperty.property.getFullyQualifiedIdentifier()){
                if (listings[i].evaluator.getFullyQualifiedIdentifier()==valuateProperty.evaluator.getFullyQualifiedIdentifier()){
                    valuation = listings[i];
                    valuation.amount = valuateProperty.amount;                    
                    update = true;
                }
            }
        }

        if (valuation==null){
            //create mortgage valuation
            var newID = guid();
            valuation = factory.newResource(namespace, 'MortgageValuation', newID.toString());
            valuation.property = valuateProperty.property;
            valuation.evaluator = valuateProperty.evaluator;
            valuation.amount = valuateProperty.amount;
        }

        return getAssetRegistry(namespace +'.MortgageValuation');
    }).then(function (mortgageValuationRegistry){
        if (update){
            return mortgageValuationRegistry.update(valuation);
        }else{
            return mortgageValuationRegistry.add(valuation);            
        }
    })
}

/**
 * Validate whether a mortgage request can be successfully served
 * @param {org.acme.biznet.ValidateMortgage} validateMortgage - the validateMortgage transaction
 * @transaction
 */
function validateMortgage(validateMortgage){
    
        var factory = getFactory();
        var namespace = 'org.acme.biznet';
        var valuation = null;

        // check credit rating
        if (validateMortgage.mortgageApplier.creditRating < validateMortgage.lender.creditRatingThreshold){
            throw new Error('Inadequate credit rating for this lender. Mortgage application denied.')
        }

        // calculate mortgage amount - find valuation - take percentage of valuation or listing price whichever is lower. 
        // percentage depends on credit rating of applier
        return getAssetRegistry(namespace + 'MortgageValuation')
        .then(function (mortgageValuationRegistry){
            return mortgageValuationRegistry.getAll();
        }).then(function (listings){
            for (var i = 0; i< listings.length ; i++){
                if (listings[i].property.getFullyQualifiedIdentifier()==validateMortgage.listing.propertyOnSale.getFullyQualifiedIdentifier()){
                    if (listings[i].evaluator.getFullyQualifiedIdentifier()==validateMortgage.lender.getFullyQualifiedIdentifier()){
                        valuation = listings[i];
                    }
                }
            }

            if(valuation==null){
                throw new Error('No Mortgage Valuation exists for this property. Mortgage Denied.')
            }

            var amountBeforePercentage = valuation.amount < validateMortgage.listing.askingPrice ? valuation.amount : validateMortgage.listing.askingPrice;
            var percentage =  (Math.random() * (70 - 40) + 40)/100 * validateMortgage.mortgageApplier.creditRating/100;
            var mortgageAmount = amountBeforePercentage * percentage;

            // borrower should have enough available funds with mortgage value to afford property
            if (mortgageAmount + validateMortgage.mortgageApplier.availableFunds < validateMortgage.listing.askingPrice){
                throw new Error ('Insufficient funds to purchase property through mortgage and borrower available funds. Mortagage Denied');
            }

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