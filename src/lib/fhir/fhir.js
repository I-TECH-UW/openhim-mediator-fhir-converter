// -------------------------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

const { now } = require("fp-ts/lib/Date");
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
        try {
            let entry = bundle.entry.find(e => e.resource.resourceType == resourceName)
            return (entry && entry.resource) ? entry.resource : null
        } catch (e) {
            logger.error(`Can't get ${resourceName} from \n${JSON.stringify(bundle)}`)
            return null
        }
    }

    parseAdt(bundle) {
        let res = {};
        let patient = this.getResource(bundle, "Patient");
        let sourceLocation = this.getResource(bundle, "Location");
        let provider = this.getResource(bundle, "Practitioner");;

        res = this.setPatientData(patient, res);
        res = this.setProviderData(provider, res);

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
        let patient = this.getResource(bundle, "Patient");
        let provider = this.getResource(bundle, "Practitioner");;

        let serviceRequest = this.getResource(bundle, "ServiceRequest");
        let task = this.getResource(bundle, "Task");
        let org = this.getResource(bundle, "Organization");
        let sourceLocation = this.getResource(bundle, "Location");

        res = this.setPatientData(patient, res);
        res = this.setProviderData(provider, res);

        res.facilityId = sourceLocation ? sourceLocation.id : "";
        res.labOrderId = task.identifier ? task.identifier[0].value : "";
        let orderDateTime = new Date()
        try {
            orderDateTime = serviceRequest.authoredOn ? new Date(serviceRequest.authoredOn) : (task.authoredOn ? new Date(task.authoredOn) : orderDateTime)
            res.labOrderDatetime = orderDateTime ? orderDateTime.getFullYear().toString()+(orderDateTime.getMonth()+1).toString().padStart(2, '0')+orderDateTime.getDate().toString().padStart(2, '0')+orderDateTime.getHours().toString().padStart(2, '0')+orderDateTime.getMinutes().toString().padStart(2, '0')+orderDateTime.getSeconds().toString().padStart(2, '0') : "";
        } catch(e) {
            console.error(e);
            res.labOrderDatetime = ""
        }
    
        if(serviceRequest.code && serviceRequest.code.coding && serviceRequest.code.coding.length > 0) {
            let ipmsCode = serviceRequest.code.coding.find(e => e.system == "https://api.openconceptlab.org/orgs/B-TECHBW/sources/IPMS-LAB-TEST/")
            res.labOrderMnemonic = ipmsCode && ipmsCode.code ? ipmsCode.code : "";
            res.labOrderName = ipmsCode && ipmsCode.display ? ipmsCode.display : "";
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

        res.patientFirstName = [""]
        res.patientFamilyName = ""
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

    setProviderData(provider, res) {
        let q;

        if(provider && provider.name) {
            q = provider.name.find(n => n.use == 'official');
            res.providerLastName = q ? q.family : "";
            res.providerFirstNames =  q && q.given.length > 0 ? q.given : [""];    
        }
        
        res.providerId = provider ? provider.id : "";
        
        return res;
    }

};