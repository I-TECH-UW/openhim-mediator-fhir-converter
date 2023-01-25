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

    getResource(bundle, resourceName) {
        let entry = bundle.entry.find(e => e.resource.resourceType == resourceName)
        return (entry && entry.resource) ? entry.resource : null
    }

    parseAdt(bundle) {
        let res = {};
        let patient = this.getResource(bundle, "Patient");
        let provider = this.getResource(bundle, "Practitioner");;
        let sourceLocation = this.getResource(bundle, "Location");

        res = this.setPatientData(patient, res);

        let q;

        if(provider && provider.name) {
            q = provider.name.find(n => n.use == 'official');
            res.providerLastName = q ? q.family : "";
            res.providerFirstNames =  q && q.given.length > 0 ? q.given : [""];    
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
        let patient = (bundle.entry.find(e => e.resource.resourceType == "Patient")).resource;
        let serviceRequest = (bundle.entry.find(e => e.resource.resourceType == "ServiceRequest" && e.resource.basedOn)).resource;
        let task = (bundle.entry.find(e => e.resource.resourceType == "Task")).resource;
        let org = (bundle.entry.find(e => e.resource.resourceType == "Organization")).resource;

        res = this.setPatientData(patient, res);
        res.labOrderId = task.identifier ? task.identifier[0].value : "";
        res.labOrderDatetime = serviceRequest.authoredOn ? serviceRequest.authoredOn.split('-').join('') : "";
        if(serviceRequest.code && serviceRequest.code.coding && serviceRequest.code.coding.length > 0) {
            let ipmsCode = serviceRequest.code.coding.find(e => e.system == "https://api.openconceptlab.org/orgs/B-TECHBW/sources/IPMS-LAB-TEST/")
            res.labOrderType = ipmsCode && ipmsCode.code ? ipmsCode.code : "";
        }
        
        return res;
    }

    setPatientData(patient, res) { 
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
            
            q = patient.identifier.find(i => i.system == 'http://moh.bw.org/ext/identifier/mr');
            res.medicalRecordNumber = q ? q.value : "";

            q = patient.identifier.find(i => i.system == 'http://moh.bw.org/ext/identifier/acc');
            res.patientAccountNumber = q ? q.value : "";

            q = patient.identifier.find(i => i.system == 'http://moh.bw.org/ext/identifier/pi');
            res.patientIdentifier = q ? q.value : "";

            q = patient.identifier.find(i => i.system == 'http://moh.bw.org/ext/identifier/unknown' && i.value);
            res.unknownIdentifier = q ? q.value : "";
        }

        res.patientFirstName = ""
        res.patientFamilyName = [""]
        if(patient && patient.name && patient.name.length > 0) {
            q = patient.name.find(n => n.use == 'official');
            if(!q) {
                q = patient.name[0] 
            }    
            res.patientFirstName = q && q.given.length > 0 ? q.given : [""];
            res.patientFamilyName = q ? q.family : "";
        }
        
        res.patientDoB = patient.birthDate ? patient.birthDate.split('-').join('') : "";
        res.sex = patient.gender ? patient.gender : "";
        
        return res;
    }
};