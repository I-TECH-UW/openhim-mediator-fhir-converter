// -------------------------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

const uuid_1 = require("uuid");

let dataHandler = require('../dataHandler/dataHandler');

module.exports = class fhir extends dataHandler {
    constructor() {
        super("fhir");
    }

    parseSrcData(bundle, templateName) {
        return new Promise((fulfill, reject) => {
            let out = { fhir: {} }
            out._originalData = bundle

            try {
                if (templateName && templateName.includes("ADT")) {
                    out.fhir = this.parseAdt(bundle)

                }
                else if (templateName && templateName.includes("ORM")) {
                    out.fhir = this.parseOrm(bundle);
                }

                out.fhir.controlId = uuid_1.v4().toString();
                out.fhir.date = new Date().toISOString().slice(0, 10).split('-').join('')
            } catch (error) {
                let e = error;
                reject(out)
                console.log(`Could not parse Bundle!\n${e.message}\n${e.stack ? e.stack : ""}`)
            }

            fulfill(out)
        })
    }

    preProcessTemplate(templateStr) {
        return super.preProcessTemplate(templateStr);
    }

    postProcessResult(inResult) {
        return inResult
    }

    getConversionResultMetadata(context) {
        return super.getConversionResultMetadata(context);
    }

    parseAdt(bundle) {
        let res = {};
        let patient = (bundle.entry.find(e => e.resource.resourceType == "Patient")).resource;
        let provider = (bundle.entry.find(e => e.resource.resourceType == "Practitioner")).resource;
        let sourceLocation = (bundle.entry.find(e => e.resource.resourceType == "Location")).resource;
        let targetLocation = (bundle.entry.reverse().find(e => e.resource.resourceType == "Location")).resource;
        let sourceOrganization = (bundle.entry.find(e => e.resource.resourceType == "Organization")).resource;
        let targetOrganization = (bundle.entry.reverse().find(e => e.resource.resourceType == "Organization")).resource;
        res.patientId = patient.id;
        res.patientDob = patient.birthDate.split('-').join('');
        res.patientSex = patient.gender && patient.gender == 'male' ? "M" : "F";
        
        if(patient.address){
            res.patientStreetAddress = patient.address.length > 0 && patient.address[0].line.length > 0 ? patient.address[0].line[0] : "";
            res.patientCity = patient.address.length > 0 ? patient.address[0].city : "";
            res.patientProvince = patient.address.length > 0 ? patient.address[0].state : "";
            res.patientPostalCode = patient.address.length > 0 ? patient.address[0].postalCode : "";
        }
        res.patientMaritalStatus = patient.maritalStatus && patient.maritalStatus.coding.length > 0 ? patient.maritalStatus.coding[0].code : "";    

        let q;
        if(patient.telecom) {
            q = patient.telecom.find(e => e.system == 'phone' && e.use == 'work')
            res.patientBusinessPhoneNumber = q ? q.value : "";
            q = patient.telecom.find(e => e.system == 'phone' && (e.use == 'mobile' || e.use == 'home'));
            res.patientHomePhoneNumber = q ? q.value : "";
            q = patient.telecom.find(e => e.system == 'email');
            res.patientEmail = q ? q.value : "";    
        }

        if(patient.identifier) {
            q = patient.identifier.find(i => i.system == 'http://moh.bw.org/ext/identifier/omang');
            res.patientOmang = q ? q.value : "";    
        }

        if(patient.name) {
            q = patient.name.find(n => n.use == 'official');
            res.patientFirstName = q && q.given.length > 0 ? q.given[0] : "";
            res.patientFamilyName = q ? q.family : "";
        }

        if(provider.name) {
            q = provider.name.find(n => n.use == 'official');
            res.providerLastName = q ? q.family : "";
            res.providerFirstName =  q && q.given.length > 0 ? q.given[0] : "";    
        }
        
        res.providerId = provider ? provider.id : "";
        res.facilityId = sourceLocation ? sourceLocation.id : "";
        res.kinFamilyName = "";
        res.kinFirstName = "";
        res.kinRelCode = "";
        res.kinRelation = "";
        res.kinStreetAddress = "";
        res.kinCity = "";
        res.kinProvince = "";
        res.kinPostalCode = "";
        return res;
    }
    parseOrm(bundle) {
        let res = {};
        let patient = bundle.entry[1].resource;
        let serviceRequest = bundle.entry[4].resource;
        res.patientId = patient.id;
        res.patientOmang = patient.identifier[0].value;
        res.patientFirstName = patient.name[0].given[0];
        res.patientLastName = patient.name[0].family;
        res.patientDoB = patient.birthDate.split('-').join('');
        res.sex = patient.gender;
        res.labOrderId = serviceRequest.identifier ? serviceRequest.identifier[0].value : "";
        res.labOrderDatetime = serviceRequest.authoredOn ? serviceRequest.authoredOn.split('-').join('') : "";
        res.labOrderType = serviceRequest.code.coding[0].code;
        return res;
    }

};