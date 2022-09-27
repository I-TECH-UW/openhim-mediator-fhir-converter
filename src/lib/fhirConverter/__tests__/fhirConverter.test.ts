"use strict";

import FhirConverter from '../fhirConverter'
import { R4 } from '@ahryman40k/ts-fhir-types'
import got from 'got'

describe('translateBundle', 
  () => { 
    beforeEach(() => {
      jest.setTimeout(25000);
    })

    it('should return a HL7v2 Message', async () => { 
      jest.setTimeout(100000);

      let testBundle: R4.IBundle = await got.get("https://b-techbw.github.io/bw-lab-ig/Bundle-example-bw-lab-bundle.json").json();

      let fc = new FhirConverter(testBundle, 'ADT_A04_TO_IPMS.hbs');

      const result = await fc.translateBundle();

      expect(result.resultMsg).toMatch("|");
      let patient: R4.IPatient = <R4.IPatient>testBundle.entry![1].resource!;

      expect(result.resultMsg).toMatch(patient.name![0].family!) 
  }); 
});