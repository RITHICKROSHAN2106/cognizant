from typing import Dict, Any, List


class FHIRAdapterService:
    """Transforms MedInsight MongoDB clinical entities into HL7 FHIR R4-compatible resources."""

    @staticmethod
    def patient_to_fhir(patient: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "resourceType": "Patient",
            "id": str(patient.get("id")),
            "identifier": [
                {
                    "use": "usual",
                    "type": {
                        "coding": [{"system": "http://terminology.hl7.org/CodeSystem/v2-0203", "code": "MR"}]
                    },
                    "system": "urn:oid:medinsight:mrn",
                    "value": patient.get("mrn")
                }
            ],
            "active": True,
            "name": [
                {
                    "use": "official",
                    "family": patient.get("last_name"),
                    "given": [patient.get("first_name")]
                }
            ],
            "gender": patient.get("sex", "unknown").lower(),
            "birthDate": patient.get("dob"),
            "extension": [
                {
                    "url": "http://hl7.org/fhir/StructureDefinition/us-core-race",
                    "valueString": patient.get("race", "Unknown")
                },
                {
                    "url": "http://hl7.org/fhir/StructureDefinition/us-core-ethnicity",
                    "valueString": patient.get("ethnicity", "Unknown")
                }
            ]
        }

    @staticmethod
    def encounter_to_fhir(enc: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "resourceType": "Encounter",
            "id": enc.get("encounter_id", "ENC-001"),
            "status": "in-progress" if enc.get("is_current") else "finished",
            "class": {
                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                "code": "IMP",
                "display": enc.get("encounter_type", "Inpatient")
            },
            "subject": {
                "reference": f"Patient/{enc.get('patient_id')}"
            },
            "period": {
                "start": str(enc.get("admission_date")),
                "end": str(enc.get("discharge_date")) if enc.get("discharge_date") else None
            },
            "reasonCode": [
                {
                    "text": enc.get("primary_diagnosis", "General Admission")
                }
            ],
            "location": [
                {
                    "location": {
                        "display": f"Ward {enc.get('ward')}, Room {enc.get('room')}"
                    }
                }
            ],
            "hospitalization": {
                "admitSource": {"text": enc.get("admission_source", "Emergency")},
                "dischargeDisposition": {"text": enc.get("discharge_disposition", "Pending")}
            }
        }

    @staticmethod
    def condition_to_fhir(diag: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "resourceType": "Condition",
            "id": f"cond-{diag.get('id')}",
            "clinicalStatus": {
                "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": diag.get("status", "active").lower()}]
            },
            "category": [
                {
                    "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-category", "code": "encounter-diagnosis"}]
                }
            ],
            "code": {
                "coding": [
                    {
                        "system": "http://hl7.org/fhir/sid/icd-10-cm",
                        "code": diag.get("icd_code"),
                        "display": diag.get("description")
                    }
                ],
                "text": diag.get("description")
            },
            "subject": {"reference": f"Patient/{diag.get('patient_id')}"},
            "recordedDate": str(diag.get("diagnosed_at"))
        }

    @staticmethod
    def observation_to_fhir(obs: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "resourceType": "Observation",
            "id": f"obs-{obs.get('id')}",
            "status": "final",
            "category": [
                {
                    "coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs"}]
                }
            ],
            "code": {
                "coding": [{"system": "http://loinc.org", "code": obs.get("code"), "display": obs.get("name")}],
                "text": obs.get("name")
            },
            "subject": {"reference": f"Patient/{obs.get('patient_id')}"},
            "effectiveDateTime": str(obs.get("recorded_at")),
            "valueQuantity": {
                "value": obs.get("value"),
                "unit": obs.get("unit")
            }
        }

    @staticmethod
    def medication_to_fhir(med: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "resourceType": "MedicationRequest",
            "id": f"med-{med.get('id')}",
            "status": "active" if med.get("is_active") else "completed",
            "intent": "order",
            "medicationCodeableConcept": {
                "text": med.get("medication_name")
            },
            "subject": {"reference": f"Patient/{med.get('patient_id')}"},
            "dosageInstruction": [
                {
                    "text": f"{med.get('dose')} {med.get('route')} {med.get('frequency')}",
                    "route": {"text": med.get("route")}
                }
            ],
            "authoredOn": str(med.get("prescribed_at"))
        }


fhir_service = FHIRAdapterService()
