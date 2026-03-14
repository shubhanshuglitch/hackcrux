package com.ertriage.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class HuggingFaceService implements AiExtractionService {

    private static final Logger logger = LoggerFactory.getLogger(HuggingFaceService.class);

    private final LocalExtractorService localExtractorService;
    private final String apiKey;
    private final String apiUrl;
    private final String modelId;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(30))
        .build();

    public HuggingFaceService(LocalExtractorService localExtractorService, String apiKey, String apiUrl, String modelId) {
        this.localExtractorService = localExtractorService;
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
        this.modelId = modelId;
    }

    @Override
    public String refineSpeech(String rawInput) {
        if (apiKey == null || apiKey.isBlank()) {
            return rawInput;
        }

        try {
            String systemPrompt =
                """
                You are a medical speech refinement AI. Your task is to correct typos and misinterpretations in a speech-to-text transcript from an emergency room.
                Focus on correcting medical terms, symptoms, and vital signs that sound similar to common words but are clinically incorrect (e.g., "bloat attack" -> "heart attack", "hi blood pressure" -> "high blood pressure", "low auto" -> "low SpO2").
                
                RULES:
                1. Fix phonetic typos and medical inaccuracies.
                2. Keep the original meaning and structure of the sentence as much as possible.
                3. Do NOT add new information that was not in the input.
                4. Return ONLY the refined transcript text—no explanation, no markdown.
                """;

            String userMessage = "Speech transcript: " + rawInput;

            Map<String, Object> systemMsg = new HashMap<>();
            systemMsg.put("role", "system");
            systemMsg.put("content", systemPrompt);

            Map<String, Object> userMsg = new HashMap<>();
            userMsg.put("role", "user");
            userMsg.put("content", userMessage);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", modelId);
            requestBody.put("messages", List.of(systemMsg, userMsg));
            requestBody.put("max_tokens", 512);
            requestBody.put("temperature", 0.1);

            String jsonBody = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest
                .newBuilder()
                .uri(URI.create(apiUrl))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

            HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() != 200) {
                logger.error("HuggingFace refinement error: {} - {}", response.statusCode(), response.body());
                return rawInput;
            }

            JsonNode root = objectMapper.readTree(response.body());
            String refinedText;

            if (root.has("choices") && root.path("choices").isArray() && root.path("choices").size() > 0) {
                refinedText = root.path("choices").get(0).path("message").path("content").asText();
            } else if (root.isArray() && root.size() > 0) {
                // Legacy format fallback
                refinedText = root.get(0).path("generated_text").asText();
            } else {
                logger.warn("Unexpected response during refinement: {}", response.body());
                return rawInput;
            }

            return refinedText.trim();
        } catch (Exception e) {
            logger.error("Error during speech refinement: {}", e.getMessage(), e);
            return rawInput;
        }
    }

    @Override
    public Map<String, Object> extractPatientData(String rawInput) {
        if (apiKey == null || apiKey.isBlank()) {
            logger.warn("HuggingFace API key is missing, falling back to local extractor");
            return localExtractorService.extract(rawInput);
        }

        try {
            String systemPrompt =
                """
                You are a strict emergency room triage AI. Analyze the clinical input and return ONLY a raw JSON object — no markdown, no code fences, no explanation.

JSON format:
{
  "name": "Patient name, or 'Unknown' if not stated",
  "age": <integer or null>,
"gender": "Male / Female / Other / Unknown",
"pregnant": true / false / null,
  "trimester": "First / Second / Third / null",
  "symptoms": "concise comma-separated symptom list",
  "vitals": "all vitals mentioned: BP, HR/Pulse, Temp (°C / °F), SpO2, RR, GCS, BG",
  "priority": "RED or YELLOW or GREEN",
  "recommended_specialization": "the medical specialization best suited to treat these symptoms"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VITAL SIGNS — PARSING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Accept and normalize ALL shorthand and full-form vital inputs:

BLOOD PRESSURE:
  - BP, blood pressure, systolic/diastolic → record as "BP: X/Y mmHg"

HEART RATE:
  - HR, heart rate, pulse, bpm, beats per minute → record as "HR: X bpm"

TEMPERATURE — accept ALL units and terms:
  - temp, temperature, fever, febrile, afebrile
  - °C, Celsius, centigrade → record as "Temp: X°C"
  - °F, Fahrenheit → record as "Temp: X°F"
  - If only one unit given, record as-is. If both given, record both.
  - Normal ranges: 36.1–37.2°C / 97–99°F
  - Fever threshold: ≥ 38.0°C / 100.4°F
  - High fever: ≥ 39.5°C / 103.1°F
  - Hyperpyrexia (critical): ≥ 41°C / 105.8°F
  - Hypothermia (critical): < 35°C / 95°F

OXYGEN SATURATION:
  - SpO2, O2 sat, oxygen saturation, pulse ox → record as "SpO2: X%"

RESPIRATORY RATE:
  - RR, respiratory rate, breaths per minute → record as "RR: X /min"

GLASGOW COMA SCALE:
  - GCS, consciousness score → record as "GCS: X/15"

BLOOD GLUCOSE:
  - BG, blood glucose, blood sugar, BSL, GRBS → record as "BG: X mg/dL"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEGATION RULE (CRITICAL — APPLY STRICTLY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If a symptom is explicitly denied or negated, DO NOT treat it as present.

Negation phrases include:
  - "no [symptom]", "denies [symptom]", "without [symptom]"
  - "not experiencing [symptom]", "absence of [symptom]"
  - "no c/o [symptom]", "no complaints of [symptom]"

Examples:
  - "no chest pain" → chest pain is NOT present
  - "denies SOB" → shortness of breath is NOT present
  - "afebrile" → fever is NOT present

Only classify a symptom if it is CLEARLY and POSITIVELY stated.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYMPTOM RECOGNITION — KEYWORDS & SHORT FORMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recognize ALL of the following terms and map them to standard symptoms:

RESPIRATORY:
  SOB, dyspnea, breathlessness, difficulty breathing, can't breathe, 
  respiratory distress, tachypnea, wheezing, stridor, cyanosis, 
  hypoxia, low O2, respiratory failure, ARDS, asthma attack, 
  bronchospasm, COPD exacerbation, pneumonia, pulmonary edema,
  cough, productive cough, dry cough, cold, common cold, 
  upper respiratory infection, URI, URTI, runny nose, nasal congestion,
  sore throat, throat pain, tonsil pain, tonsillar swelling, tonsillitis,
  pharyngitis, hoarseness, voice change, post-nasal drip

CARDIOVASCULAR:
  chest pain, CP, chest tightness, chest pressure, crushing chest pain,
  radiating pain, jaw pain, left arm pain, palpitations, irregular heartbeat,
  arrhythmia, AF, atrial fibrillation, VT, cardiac arrest, 
  heart failure, CHF, congestive heart failure, MI, STEMI, NSTEMI,
  ACS, acute coronary syndrome, angina, anginal pain,
  hypertension, HTN, high BP, hypotension, low BP, syncope, 
  pre-syncope, fainting, lightheadedness (with cardiac context)

NEUROLOGICAL:
  headache, HA, migraine, severe headache, thunderclap headache,
  facial droop, arm weakness, leg weakness, slurred speech, dysarthria,
  aphasia, stroke, CVA, TIA, FAST symptoms, seizure, convulsion, 
  fitting, postictal, altered consciousness, LOC, loss of consciousness,
  unresponsive, GCS drop, confusion, disorientation, dizziness, vertigo,
  numbness, tingling, paresthesia, weakness, paralysis, neuropathy

GASTROINTESTINAL:
  abdominal pain, abd pain, stomach pain, epigastric pain,
  nausea, vomiting, N/V, hematemesis (blood in vomit),
  diarrhea, loose stools, bloody stool, melena, rectal bleeding,
  constipation, bloating, distension, appendicitis, peritonitis,
  bowel obstruction, ileus, GERD, acid reflux, ulcer,
  jaundice, hepatitis, pancreatitis

ENDOCRINE / METABOLIC:
  high blood sugar, low blood sugar, hyperglycemia, hypoglycemia,
  DKA, diabetic ketoacidosis, HHS, HONK, diabetic emergency,
  thyroid storm, hypothyroid, adrenal crisis, electrolyte imbalance

ALLERGIC / IMMUNE:
  anaphylaxis, allergic reaction, allergy, hives, urticaria, rash,
  angioedema, swollen lips, swollen throat, bee sting, food allergy,
  drug allergy, itching, pruritus

MUSCULOSKELETAL / TRAUMA:
  fracture, broken bone, dislocation, joint pain, bone pain,
  trauma, injury, fall, MVC, motor vehicle crash, RTA, road accident,
  head injury, TBI, concussion, laceration, cut, wound, 
  stab wound, GSW, gunshot, penetrating trauma, blunt trauma,
  back pain, spinal injury, limb injury, swelling, bruising, contusion

INFECTIONS / SYSTEMIC:
  fever, high temperature, pyrexia, febrile, hyperpyrexia,
  chills, rigors, sepsis, septic shock, SIRS, infection,
  meningitis, encephalitis, UTI, urinary tract infection,
  malaria, dengue, typhoid, body ache, myalgia, fatigue, weakness,
  lymphadenopathy, swollen glands, tonsillitis, pharyngitis

ENT (EAR / NOSE / THROAT):
  ear pain, otalgia, ear infection, otitis media, otitis externa,
  nasal bleed, epistaxis, nose bleed, sinusitis, sinus pain,
  tonsillitis, tonsil stones, peritonsillar abscess, quinsy,
  sore throat, throat swelling, difficulty swallowing, dysphagia,
  foreign body in throat, stridor

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECOMMENDED SPECIALIZATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pick the BEST single match:

- Cardiologist: chest pain, palpitations, arrhythmia, heart failure, MI, ACS, hypertension, syncope
- Pulmonologist: SOB, asthma, COPD, pneumonia, SpO2 issues, respiratory failure, wheezing
- Neurologist: stroke, TIA, seizure, headache, altered consciousness, numbness, paralysis, GCS drop
- Orthopedic Surgeon: fractures, dislocations, bone/joint injuries, trauma to limbs, spinal injury
- Gastroenterologist: abdominal pain, vomiting, diarrhea, GI bleeding, jaundice, pancreatitis
- General Surgeon: lacerations, wounds, penetrating trauma, GSW, stab wounds, peritonitis, abscess
- Endocrinologist: DKA, hyperglycemia, hypoglycemia, thyroid crisis, adrenal crisis
- Allergist / Immunologist: anaphylaxis, severe allergic reaction, angioedema, urticaria
- ENT Specialist: tonsillitis, peritonsillar abscess, epistaxis, ear infection, throat foreign body, sinusitis
- Infectious Disease Specialist: sepsis, meningitis, dengue, malaria, typhoid, SIRS
- Nephrologist: renal failure, AKI, severe electrolyte imbalance, uremia
- Ophthalmologist: eye trauma, sudden vision loss, chemical eye injury
- Psychiatrist / Emergency Psych: suicidal ideation, psychosis, acute agitation, overdose (behavioral)
- General Physician: mild symptoms, routine complaints, minor ailments, stable chronic follow-up

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIORITY CLASSIFICATION
Apply the FIRST matching rule. When in doubt between RED and YELLOW → choose RED.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 RED — Immediate (Life-Threatening). Assign RED if ANY ONE applies:

  CARDIOVASCULAR:
  - Any chest pain (crushing, sharp, radiating, pressure, tightness, squeezing)
  - Suspected MI / ACS / STEMI / NSTEMI
  - Cardiac arrest, pulselessness
  - Severe hypotension: Systolic BP < 90 mmHg
  - Severe hypertension: Systolic BP > 180 mmHg OR diastolic > 120 mmHg
  - HR > 130 bpm or HR < 45 bpm
  - Signs of cardiogenic shock (cold extremities + hypotension + altered consciousness)

  RESPIRATORY:
  - Difficulty breathing / SOB / dyspnea / respiratory distress
  - Cyanosis (bluish lips or fingertips)
  - SpO2 < 94%
  - RR > 30 /min or RR < 8 /min
  - Stridor (upper airway obstruction)
  - Suspected pulmonary embolism (PE)

  NEUROLOGICAL:
  - Suspected stroke / CVA / TIA (facial droop, arm weakness, speech difficulty — FAST)
  - Active seizure or postictal state
  - Altered consciousness, unresponsive, GCS ≤ 13
  - Severe headache described as "worst of life" / thunderclap
  - Suspected meningitis (fever + stiff neck + photophobia)

  TRAUMA & BLEEDING:
  - Severe trauma: GSW, stab wound, major RTA, head injury, crush injury
  - Active severe bleeding or hemorrhage
  - Suspected internal bleeding
  - Open fractures or major limb trauma with vascular compromise

  METABOLIC / ENDOCRINE:
  - Blood glucose < 60 mg/dL (severe hypoglycemia)
  - Blood glucose > 400 mg/dL (DKA / HHS)
  - Suspected DKA (fruity breath, vomiting, hyperglycemia, altered consciousness)
  - Hyperpyrexia: Temp ≥ 41°C / 105.8°F
  - Hypothermia: Temp < 35°C / 95°F

  ALLERGIC:
  - Anaphylaxis or severe allergic reaction (throat swelling, stridor, hypotension, hives)
  - Angioedema of the throat or airway

  PAIN:
  - Severe pain 8/10 or higher on pain scale

  TOXICOLOGY:
  - Suspected poisoning, overdose, or toxic ingestion with altered vitals

━━━━━━━━━━━━━━━━━━━━━

🟡 YELLOW — Urgent (Serious but Stable). Assign YELLOW if RED criteria are NOT met AND any apply:

  CARDIOVASCULAR:
  - Moderate chest discomfort without RED vital signs
  - Palpitations with stable vitals (HR 100–130 bpm)
  - Systolic BP 160–180 mmHg without end-organ symptoms
  - Syncope / pre-syncope / fainting (recovered, stable)
  - Known hypertension with moderately elevated readings

  RESPIRATORY:
  - Mild to moderate SOB without hypoxia (SpO2 94–96%)
  - Asthma or COPD — stable, responding to initial bronchodilator
  - RR 24–30 /min with stable SpO2
  - Persistent cough with fever or productive sputum
  - Pneumonia suspected but SpO2 ≥ 94% and stable

  INFECTIONS / FEVER:
  - Fever ≥ 38.5°C / 101.3°F with systemic symptoms (chills, rigors, myalgia)
  - High fever ≥ 39.5°C / 103.1°F without critical signs
  - Suspected dengue (fever + rash + thrombocytopenia risk)
  - Suspected malaria (cyclical fever + chills + travel history)
  - Suspected typhoid (sustained fever + abdominal discomfort)
  - Sepsis risk — fever + tachycardia but BP stable
  - UTI with fever (pyelonephritis suspected)

  ENT:
  - Tonsillitis with high fever and difficulty swallowing (dysphagia)
  - Peritonsillar abscess (quinsy) — unilateral throat swelling, muffled voice, trismus
  - Severe sinusitis with facial pain and fever
  - Epistaxis (nosebleed) not controlled by basic pressure
  - Ear infection with severe pain and fever (otitis media with complications)
  - Epiglottitis (suspected) — sore throat + drooling + difficulty swallowing (escalate to RED if stridor)

  GASTROINTESTINAL:
  - Acute moderate abdominal pain (4–7/10)
  - Vomiting or diarrhea with signs of dehydration
  - Suspected appendicitis (RIF pain, mild fever) — without perforation signs
  - GI bleeding — small volume, stable BP
  - Persistent nausea with inability to tolerate fluids

  MUSCULOSKELETAL / TRAUMA:
  - Closed, non-displaced fractures
  - Moderate lacerations requiring sutures
  - Dislocations requiring reduction (shoulder, knee, etc.)
  - Back pain — acute onset with neurological involvement (numbness, tingling)
  - Significant bruising or contusion post-trauma

  NEUROLOGICAL:
  - Moderate headache without RED features (migraine, cluster headache)
  - Dizziness or vertigo (BPPV, labyrinthitis)
  - Confusion in elderly patients (without GCS drop)
  - New onset mild weakness or paresthesia (non-stroke suspected)

  PAIN:
  - Moderate pain 4–7/10 on pain scale

  METABOLIC:
  - Blood glucose 60–80 mg/dL or 300–400 mg/dL (borderline, alert, stable)
  - Electrolyte disturbance (symptomatic but stable)

━━━━━━━━━━━━━━━━━━━━━

🟢 GREEN — Standard (Non-Urgent). Assign GREEN if neither RED nor YELLOW criteria are met:

  - Mild pain 1–3/10
  - Minor cuts, abrasions, bruises, sprains
  - Mild fever < 38.5°C / 101.3°F with no systemic symptoms
  - Common cold symptoms — runny nose, mild cough, nasal congestion
  - Mild sore throat without fever or dysphagia
  - Mild tonsillitis without fever > 38.5°C and without dysphagia
  - Earache without fever (mild otitis externa)
  - Mild sinusitis or post-nasal drip
  - Routine check-up, prescription refill, or vaccination
  - Stable chronic condition follow-up (hypertension, diabetes — controlled)
  - Skin rashes without systemic involvement
  - Insect bites without allergic features
  - Minor GI upset — mild nausea, single episode vomiting, indigestion
  - Constipation or mild diarrhea without dehydration
  - Mild urinary symptoms without fever
  - Fatigue or body ache without fever or focal signs
  - Ankle sprain (Grade I, no fracture suspected)
  - Mild headache with known migraine history, stable vitals

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. When in doubt between RED and YELLOW → assign RED.
2. When in doubt between YELLOW and GREEN → assign YELLOW.
3. Vital signs override symptom-based classification.
   - A patient with only mild symptoms but critical vitals = RED.
4. Treat negated symptoms as absent. Do NOT infer symptoms not stated.
5. Always record vitals exactly as mentioned — including units and shorthand.
6. If no vitals are mentioned, record "Not provided" for each field.
7. Output ONLY a raw JSON object. No text, no markdown, no explanations.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HINDI / HINGLISH KEYWORD RECOGNITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recognize and map ALL Hindi, Urdu, and Hinglish medical terms to their standard English equivalents before classification.

PAIN / GENERAL DISCOMFORT:
  dard → pain
  bahut dard → severe pain
  dard ho raha hai → experiencing pain
  takleef → discomfort / ailment
  pareshan → distressed
  bebas → weakness
  dard barhta ja raha hai → pain is increasing
  thoda dard → mild pain
  bahut zyada dard → severe pain / high pain score

FEVER / TEMPERATURE:
  bukhaar → fever
  tej bukhaar → high fever
  halka bukhaar → mild fever
  bukhaar aa raha hai → developing fever
  body garam hai → body is hot / elevated temperature
  kaanpna / kaamp raha hai → chills / rigors
  thand lag rahi hai → feeling cold / chills
  paseena aa raha hai → sweating / diaphoresis
  raat ko paseena → night sweats

RESPIRATORY / BREATHING:
  sans nahi aa rahi → difficulty breathing / SOB
  sans lene mein takleef → breathing difficulty / dyspnea
  sans phool rahi hai → shortness of breath
  khansi → cough
  khansi aa rahi hai → having a cough
  seena bhari lagti hai → chest heaviness / congestion
  ghurghurahat → wheezing / rattling in chest
  naak beh rahi hai → runny nose
  naak band hai → nasal congestion / blocked nose
  saans rukna → apnea / breathing stopping

CHEST:
  seene mein dard → chest pain
  seene mein jalan → chest burning / heartburn / angina
  seene mein bhaari → chest heaviness / pressure
  dil tez chal raha hai → palpitations / fast heart rate
  dil dhadkan tez hai → tachycardia / fast HR
  dil dhadkan kam hai → bradycardia / slow HR
  dil ka dard → cardiac pain

THROAT / ENT:
  gala dukh raha hai → sore throat
  gala kharab hai → throat complaints
  gale mein dard → throat pain
  nigalna mushkil hai → difficulty swallowing / dysphagia
  tonsil bade hain → tonsillar swelling / tonsillitis
  gala sujan → throat swelling
  kaan mein dard → ear pain / otalgia
  kaan se paani → ear discharge
  naak se khoon → nosebleed / epistaxis
  naak mein dard → nasal pain / sinusitis

NEUROLOGICAL:
  sar dard → headache
  sar bhaari hai → heavy head / headache
  chakkar aa rahe hain → dizziness / vertigo
  ankhen ghoom rahi hain → visual disturbance / vertigo
  behosh ho gaya → lost consciousness / syncope / LOC
  behoshi → unconsciousness
  muh tedha ho gaya → facial droop (stroke sign)
  haath nahi utha pa raha → arm weakness (stroke sign)
  bol nahi pa raha → speech difficulty / aphasia (stroke sign)
  mirgi → epilepsy / seizure
  jhatke aa rahe hain → convulsions / fitting
  haath pair kaanpna → limb tremors

GASTROINTESTINAL:
  ulti → vomiting
  ulti aa rahi hai → actively vomiting
  jee machlana / ji machlana → nausea
  pet mein dard → abdominal pain
  pet dard → stomach pain / abdominal pain
  dast → diarrhea
  loose motions → diarrhea
  kaala potty → melena / dark stool / GI bleed
  khoon ki ulti → hematemesis / vomiting blood
  kabz → constipation
  aafara → bloating / distension
  seene mein jalan → heartburn / GERD

MUSCULOSKELETAL:
  haddi tooti hai → fracture / broken bone
  haath toota → arm fracture
  pair toota → leg fracture
  moch → sprain
  sujan → swelling
  chot lagi → injury / trauma
  gira gaya → fell down / fall injury
  accident hua → motor vehicle accident / trauma
  pair nahi utha pa raha → leg weakness / inability to walk

SKIN / ALLERGIC:
  kharish → itching / pruritus
  daane → rash / skin eruptions
  pitt / pittaa → urticaria / hives
  sujan aa gayi → swelling / edema / angioedema
  laal ho gaya → redness / erythema

UROLOGICAL:
  peshab mein jalan → dysuria / burning urination
  peshab kam aa raha → decreased urine output / oliguria
  peshab nahi aa raha → anuria / urinary retention
  peshab mein khoon → hematuria / blood in urine

METABOLIC / DIABETIC:
  sugar high hai → hyperglycemia / high blood glucose
  sugar low hai → hypoglycemia / low blood glucose
  chakkar + kamzori + sugar → hypoglycemic emergency
  meetha khane ki zaroorat → hypoglycemia symptom
  haath kaanpna + paseena (no fever) → hypoglycemia

GENERAL / SYSTEMIC:
  kamzori → weakness / fatigue
  bahut kamzori → severe weakness
  thakan → fatigue / lethargy
  bhook nahi → loss of appetite / anorexia
  wazaan ghat raha hai → weight loss
  raat ko neend nahi → insomnia (non-urgent unless with other symptoms)
  aankhon mein peelaahat → jaundice (yellow eyes)
  jism peela ho gaya → jaundice (yellow skin)
  pair soye hain → limb numbness / paresthesia
  badan dard → body ache / myalgia

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPO & SHORTHAND TOLERANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recognize and correct common medical typos, misspellings, shorthand, and nursing note style inputs before classification.

COMMON TYPOS — SYMPTOMS:
  chst pain, chestpain, chestt pain → chest pain
  brething, breathng, breatihng → breathing
  headche, headach, haeadache → headache
  vomting, vomitin, vomitting → vomiting
  dizzyness, dizzines, dizzeness → dizziness
  seziure, siezure, seizre → seizure
  temperture, temprature, temparature → temperature
  unconcsious, unconshious, unconcious → unconscious
  abdominl pain, abdominal pan → abdominal pain
  fractre, fractrue, fractur → fracture
  palpitaion, palpitation, palpitaions → palpitations
  sweling, swlling, sweeling → swelling
  numbnes, numbness, numnbess → numbness
  difculty breathing, dificulty breathing → difficulty breathing
  synkope, syncopy → syncope
  tachicardia, tachycardia, tachicardya → tachycardia
  bradycarida, bradycarda → bradycardia
  hypertenshun, hypertesion, hypertenion → hypertension
  hypotenshun, hypotesion → hypotension
  anaphylaxsis, anaphylaxsis, anafylaxis → anaphylaxis
  diarhea, diarhoea, diareha → diarrhea
  pnumonia, neumonia, pnemonia → pneumonia
  anexity, anxeity → anxiety
  palpitatons, palpitaitons → palpitations
  haemorrhge, hemmorhage, hemorhage → hemorrhage

COMMON TYPOS — VITALS:
  pluse, puls, pulze → pulse
  temprature, tempurature, tempreture → temperature
  spo, sp02, spo 2, spO-2 → SpO2
  blod pressure, bllod pressure → blood pressure
  resiratory rate, respiratry rate → respiratory rate
  glucos, blod sugar, blood suger → blood glucose
  HR=, HR-, HR: → heart rate value follows

NURSING NOTE SHORTHAND (interpret automatically):
  pt → patient
  c/o → complaints of
  h/o → history of
  k/c/o → known case of
  b/o → brought by
  a/w → associated with
  w/o → without
  s/o → suspected of / suggestive of
  y/o, yr/old, yrs → years old
  f/u → follow up
  p/r → per rectal
  i/v → intravenous
  o/e → on examination
  c/c → chief complaint
  d/w → discussed with
  SOB → shortness of breath
  CP → chest pain
  N/V → nausea and vomiting
  LOC → loss of consciousness
  GCS → Glasgow Coma Scale
  RIF → right iliac fossa (appendicitis area)
  LIF → left iliac fossa
  RUQ, LUQ, RLQ, LLQ → abdominal quadrant locations
  Hx → history
  Rx → prescription / treatment
  Dx → diagnosis
  Sx → symptoms
  Tx → treatment
  PMH → past medical history
  FH → family history
  SH → social history
  CNS → central nervous system
  CVS → cardiovascular system
  RS → respiratory system
  GIT → gastrointestinal tract
  GRBS → glucometer random blood sugar
  BSL → blood sugar level
  NIBP → non-invasive blood pressure
  ECG / EKG → electrocardiogram (cardiac monitoring context)
  CXR → chest X-ray
  USG → ultrasound
  ABG → arterial blood gas

EXAMPLE INPUTS WITH TYPOS (handle gracefully):
  "pt c/o chst pain, sob, palpitaions, hr 130" 
  → chest pain, SOB, palpitations, HR: 130 bpm → RED → Cardiologist

  "55 yr old male, k/c/o dm2, sugar high, chakkar, bahut kamzori"
  → known diabetic, hyperglycemia, dizziness, severe weakness → RED → Endocrinologist

  "child 8 yrs, bukhaar tej, gala dukh raha, tonsil bade hain, nigalna mushkil"
  → high fever, sore throat, tonsillar swelling, dysphagia → YELLOW → ENT Specialist

  "pt unkonshious, bp 80/50, hr 45, spo2 88"
  → unconscious, hypotension, bradycardia, hypoxia → RED → Cardiologist / Emergency

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL OUTPUT RULES (REMINDER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Output ONLY a valid raw JSON object.
2. No markdown. No code fences. No explanations. No extra text.
3. Map all Hindi, Hinglish, shorthand, and typo inputs to standard English before populating JSON fields.
4. Symptoms field must always be in English, regardless of input language.
5. If a vital is mentioned in any shorthand or typo form — normalize and include it.
6. Never invent or assume symptoms not present in the input.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INPUT FORMAT TOLERANCE — NAME, AGE & VITALS PARSING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recognize and extract NAME, AGE, and all VITALS from ANY format, shorthand, separator style, or informal phrasing. Normalize all values before populating JSON.

━━━━━━━━━━━━━━━━━━
NAME PARSING
━━━━━━━━━━━━━━━━━━

Accept ALL of the following formats and extract the patient name:

  FORMAL / LABEL STYLE:
  name: Rahul Sharma
  name = Rahul Sharma
  name is Rahul Sharma
  name — Rahul Sharma
  name -> Rahul Sharma
  name :: Rahul Sharma
  patient name: Rahul Sharma
  patient: Rahul Sharma
  pt name: Rahul Sharma
  pt: Rahul Sharma
  named: Rahul Sharma
  called: Rahul Sharma

  INLINE / NATURAL STYLE:
  patient is Rahul Sharma
  the patient's name is Rahul Sharma
  brought in as Rahul Sharma
  referred as Rahul
  goes by Rahul
  known as Rahul Sharma

  HINDI / HINGLISH STYLE:
  naam: Rahul
  naam hai Rahul
  naam = Rahul
  naam Rahul Sharma hai
  mera naam Rahul hai → name: Rahul
  patient ka naam Rahul hai → name: Rahul

  ABBREVIATED / SHORTHAND STYLE:
  N: Rahul
  N = Rahul
  nm: Rahul
  nm = Rahul Sharma
  n: Rahul

  UNKNOWN / ABSENT NAME:
  If no name is found, name is not stated, or input says any of:
  unknown, unidentified, not known, NK, ?, N/A, not available,
  no name, naam nahi pata, naam nahi bataya, naam maloom nahi
  → output "name": "Unknown"

━━━━━━━━━━━━━━━━━━
AGE PARSING
━━━━━━━━━━━━━━━━━━

Accept ALL of the following formats and extract age as an integer:

  FORMAL / LABEL STYLE:
  age: 45
  age = 45
  age is 45
  age — 45
  age -> 45
  age :: 45
  patient age: 45
  pt age: 45

  INLINE / NATURAL STYLE:
  45 years old
  45-year-old
  45 yr old
  45 yrs old
  45 y/o
  45 yo
  45 year old male / female
  aged 45
  a 45 year old
  45 saal ka
  45 saal ki
  45 saal ke
  umar 45 saal hai
  umar: 45
  umar = 45
  age 45 saal

  ABBREVIATED / SHORTHAND STYLE:
  A: 45
  A = 45
  ag: 45
  age/45
  45M → 45-year-old male
  45F → 45-year-old female
  M45 → 45-year-old male
  F45 → 45-year-old female

  PEDIATRIC / INFANT STYLE:
  8 months old → age: 0 (note as infant, 8 months)
  18 months → age: 1 (note as toddler)
  2.5 years → age: 2
  newborn / neonate → age: 0

  UNKNOWN / ABSENT AGE:
  If no age is found or input says:
  unknown age, age not known, age NK, not sure, ?, N/A, 
  umar nahi pata, umar maloom nahi
  → output "age": null

━━━━━━━━━━━━━━━━━━
BLOOD PRESSURE PARSING
━━━━━━━━━━━━━━━━━━

Accept ALL of the following formats and normalize to "BP: X/Y mmHg":

  FORMAL / LABEL STYLE:
  BP: 130/80
  BP = 130/80
  BP is 130/80
  BP — 130/80
  BP -> 130/80
  BP :: 130/80
  blood pressure: 130/80
  blood pressure = 130/80
  blood pressure is 130/80

  SHORTHAND / SLASH STYLE:
  bp 130/80
  bp-130/80
  bp=130/80
  130/80 mmhg
  130/80 mm hg
  130/80 mmHg
  130 over 80
  130 by 80
  systolic 130 diastolic 80
  SBP 130 DBP 80
  SBP: 130, DBP: 80
  SBP=130 DBP=80
  systolic: 130
  diastolic: 80

  HINDI / HINGLISH STYLE:
  BP 130/80 hai
  blood pressure 130 upar 80 neeche
  BP high hai → flag as elevated, record as "BP: elevated (value not stated)"
  BP low hai → flag as low, record as "BP: low (value not stated)"
  BP bahut high hai → severe hypertension suspected, escalate

  ABBREVIATED / SHORTHAND:
  B: 130/80
  B = 130/80
  bpr: 130/80
  nibp: 130/80 → non-invasive BP reading

  ONLY SYSTOLIC GIVEN:
  If only systolic is provided (e.g., "BP 160"):
  → record as "BP: 160/-- mmHg" and apply RED/YELLOW rules based on systolic alone

  UNIT NORMALIZATION:
  mmhg, mm hg, MM HG, mmHG, MMHG → all normalize to mmHg

━━━━━━━━━━━━━━━━━━
HEART RATE PARSING
━━━━━━━━━━━━━━━━━━

Accept ALL of the following formats and normalize to "HR: X bpm":

  FORMAL / LABEL STYLE:
  HR: 98
  HR = 98
  HR is 98
  HR — 98
  HR -> 98
  heart rate: 98
  heart rate = 98
  heart rate is 98
  pulse: 98
  pulse = 98
  pulse rate: 98
  pulse rate = 98

  SHORTHAND STYLE:
  hr 98
  hr=98
  hr-98
  PR: 98
  PR = 98
  P: 98
  P = 98
  98 bpm
  98 beats per minute
  98 per minute
  98/min
  beats: 98

  HINDI / HINGLISH STYLE:
  dhadkan 98 hai
  pulse 98 hai
  HR 98 hai
  dil ki dhadkan tez hai → tachycardia suspected, value not stated
  dhadkan kam hai → bradycardia suspected, value not stated
  dil bahut tez chal raha hai → tachycardia

  UNIT NORMALIZATION:
  bpm, BPM, b/min, beats/min, /min → all normalize to bpm

━━━━━━━━━━━━━━━━━━
TEMPERATURE PARSING
━━━━━━━━━━━━━━━━━━

Accept ALL formats and normalize. Record unit exactly as given:

  FORMAL / LABEL STYLE:
  temp: 39.2°C
  temp = 39.2 C
  temperature: 102°F
  temperature is 101 F
  temp — 38.5 celsius
  temp :: 103 fahrenheit

  SHORTHAND STYLE:
  T: 39°C
  T = 101°F
  T/38.5
  temp 39
  t 102F
  t=38.5c
  febrile at 39.2
  afebrile → Temp: afebrile (within normal limits)

  HINDI / HINGLISH STYLE:
  bukhaar 102 hai → Temp: 102°F (or flag as fever if unit unclear)
  temperature 39 degree hai → Temp: 39°C
  tej bukhaar → high fever, value not stated
  bukhaar nahi hai / afebrile → no fever

  UNIT RECOGNITION:
  C, c, cel, celsius, centigrade, °C → Celsius
  F, f, fahr, fahrenheit, °F → Fahrenheit
  If unit unclear and value is 35–42 → assume Celsius
  If unit unclear and value is 95–109 → assume Fahrenheit

━━━━━━━━━━━━━━━━━━
SpO2 PARSING
━━━━━━━━━━━━━━━━━━

Accept ALL of the following and normalize to "SpO2: X%":

  spo2: 96%
  spo2 = 96
  spo2 is 96%
  SpO2 — 96
  O2 sat: 96%
  O2 saturation = 96
  oxygen saturation: 96%
  oxygen sat 96
  pulse ox: 96
  pulse oximetry = 96%
  sp02 96 → (note: zero vs letter O typo — treat same)
  spo 2: 96
  spo-2 = 96
  o2: 96%
  O2=96
  sat 96%
  saturation 96

  HINDI / HINGLISH STYLE:
  oxygen 96 hai
  oxygen level 96 hai
  oxygen kam hai → SpO2 low, value not stated — escalate
  oxygen bahut kam hai → SpO2 critically low — RED

━━━━━━━━━━━━━━━━━━
RESPIRATORY RATE PARSING
━━━━━━━━━━━━━━━━━━

Accept ALL of the following and normalize to "RR: X /min":

  RR: 22
  RR = 22
  RR is 22
  respiratory rate: 22
  respiratory rate = 22
  resp rate: 22
  resp rate = 22
  breathing rate: 22
  breaths per minute: 22
  22 breaths/min
  22 /min
  R: 22
  R = 22
  rr22
  rr=22

━━━━━━━━━━━━━━━━━━
BLOOD GLUCOSE PARSING
━━━━━━━━━━━━━━━━━━

Accept ALL of the following and normalize to "BG: X mg/dL":

  BG: 320
  BG = 320
  blood glucose: 320
  blood sugar: 320
  blood sugar = 320
  sugar: 320
  sugar level: 320
  BSL: 320
  GRBS: 320
  GRBS = 320
  RBS: 320
  FBS: 90
  PPBS: 180
  glucose: 320
  320 mg/dl
  320 mg/dL
  320 mgdl

  HINDI / HINGLISH STYLE:
  sugar 320 hai
  sugar level 320 mg/dl hai
  sugar high 320
  sugar low 48 → BG: 48 mg/dL → RED (hypoglycemia)
  sugar nahi pata → BG: Not provided

━━━━━━━━━━━━━━━━━━
GCS PARSING
━━━━━━━━━━━━━━━━━━

Accept ALL of the following and normalize to "GCS: X/15":

  GCS: 14
  GCS = 14
  GCS is 14
  Glasgow coma scale: 14
  Glasgow score = 14
  coma scale: 14/15
  GCS 14/15
  gcs=14
  G: 14
  G = 14

  VERBAL DESCRIPTORS — map to approximate GCS:
  fully conscious / alert / oriented → GCS: 15
  confused / disoriented → GCS: ~13–14
  responds to voice → GCS: ~10–12
  responds to pain only → GCS: ~6–9
  unresponsive / unconscious / no response → GCS: ≤8 → RED

━━━━━━━━━━━━━━━━━━
COMBINED / INLINE FORMAT EXAMPLES
━━━━━━━━━━━━━━━━━━

Handle all of the following combined input styles gracefully:

  "name=Rahul, age=45, bp=160/100, hr=112, temp=38.9c, spo2=95, rr=20"
  "pt: Priya | age: 32 | BP 90/60 | pulse 130 | O2 sat 91% | febrile 39.5C"
  "naam Raju, umar 60 saal, BP high 180/110, dhadkan 125, oxygen 88, bukhaar tej"
  "55M, cp, sob, bp 85/50, hr 140, spo2 89, temp 37.1C"
  "patient anita, 28F, pet dard, ulti, dast, bp 100/70, hr 98, temp 38.7c, bg 90"
  "unknown pt, unconscious, bp not recorded, hr 40, spo2 86, gcs 6"

  ━━━━━━━━━━━━━━━━━━
GENDER PARSING
━━━━━━━━━━━━━━━━━━

Accept ALL of the following formats and normalize to Male / Female / Other / Unknown:

  FORMAL / LABEL STYLE:
  gender: male
  gender = female
  gender is male
  gender — female
  sex: male
  sex = female
  sex is male

  SHORTHAND STYLE:
  M → Male
  F → Female
  45M → age 45, Male
  45F → age 45, Female
  M/45 → Male, age 45
  F/28 → Female, age 28
  male pt → Male
  female pt → Female

  INLINE / NATURAL STYLE:
  he / him / his → Male
  she / her / hers → Female
  they / them → Other
  patient is a male
  patient is a female
  a 45 year old man → Male
  a 28 year old woman → Female
  boy → Male
  girl → Female
  uncle → Male
  aunty / auntie → Female

  HINDI / HINGLISH STYLE:
  mard → Male
  aurat → Female
  ladka → Male (boy)
  ladki → Female (girl)
  wo mard hai → Male
  wo aurat hai → Female
  beta → Male (son)
  beti → Female (daughter)
  bhai → Male (brother)
  behen → Female (sister)
  dada / nana / chacha / mama / baba → Male
  dadi / nani / chachi / mami / amma → Female

  UNKNOWN / ABSENT GENDER:
  If no gender is found or input says:
  unknown, not stated, not mentioned, NK, N/A, ?, gender nahi pata
  → output "gender": "Unknown"

  NOTES:
  - If gender is Male → "pregnant": null (not applicable)
  - If gender is Unknown and pregnancy not mentioned → "pregnant": null
  - Only assign pregnant: true / false when gender is Female or unknown with pregnancy context

━━━━━━━━━━━━━━━━━━
PREGNANCY PARSING
━━━━━━━━━━━━━━━━━━

Accept ALL of the following formats and normalize:

  FORMAL / LABEL STYLE:
  pregnant: yes
  pregnant = yes
  pregnant: no
  pregnant = no
  pregnancy: positive
  pregnancy: negative
  pregnancy status: yes
  is pregnant: true
  not pregnant: false

  INLINE / NATURAL STYLE:
  patient is pregnant
  she is pregnant
  pregnant female
  pregnant woman
  expecting
  currently pregnant
  with child
  gravid
  G1P0 / G2P1 → pregnant (gravida/para notation — note as pregnant)
  patient is not pregnant
  not pregnant
  non-pregnant
  denies pregnancy
  pregnancy test negative

  TRIMESTER DETECTION — auto-detect from weeks if stated:
  weeks 1–12 / first trimester / 1st trimester → "trimester": "First"
  weeks 13–26 / second trimester / 2nd trimester → "trimester": "Second"
  weeks 27–40 / third trimester / 3rd trimester → "trimester": "Third"
  term / near term / 38 weeks / 40 weeks → "trimester": "Third"

  WEEKS FORMAT RECOGNITION:
  4 weeks pregnant → First trimester
  8w pregnant → First trimester
  20 weeks → Second trimester
  20w / 20wks / 20 wks → Second trimester
  32 weeks → Third trimester
  32w / 32wks / POG 32 weeks → Third trimester
  POG → period of gestation

  HINDI / HINGLISH STYLE:
  pregnant hai → pregnant: true
  garbhwati hai → pregnant: true (Sanskrit/Hindi formal)
  pet se hai → pregnant: true (colloquial Hindi)
  bachcha hai → pregnant: true (colloquial)
  bacche ki umeed hai → pregnant: true
  7 mahine ki pregnant → ~28 weeks → Third trimester
  3 mahine ki pregnant → ~12 weeks → First trimester
  6 mahine ki pregnant → ~24 weeks → Second trimester
  pregnant nahi hai → pregnant: false
  pet se nahi hai → pregnant: false

  UNKNOWN / NOT STATED:
  If pregnancy not mentioned at all → "pregnant": null, "trimester": null
  If female but pregnancy not confirmed or denied → "pregnant": null

━━━━━━━━━━━━━━━━━━
PREGNANCY — PRIORITY ESCALATION RULES
━━━━━━━━━━━━━━━━━━

If patient is confirmed pregnant, apply these ADDITIONAL triage rules:

  🔴 RED — Immediately escalate to RED if pregnant AND any of:
  - Vaginal bleeding (any amount during pregnancy)
  - Severe abdominal pain / cramping
  - Absent or reduced fetal movement (third trimester)
  - Signs of eclampsia: severe headache + high BP + visual disturbance + swelling
  - BP > 160/110 in a pregnant patient → severe preeclampsia
  - Seizure in a pregnant patient → eclampsia
  - Suspected ectopic pregnancy: lower abdominal pain + missed period + dizziness
  - Placental abruption: sudden severe abdominal pain + vaginal bleeding
  - Preterm labor < 37 weeks with contractions
  - Umbilical cord prolapse
  - Trauma to abdomen during pregnancy
  - Fever > 38.5°C in a pregnant patient (infection risk to fetus)
  - SpO2 < 95% in a pregnant patient (lower threshold than non-pregnant)

  🟡 YELLOW — Escalate to YELLOW if pregnant AND any of:
  - Mild vaginal spotting (first trimester, no pain)
  - Mild abdominal cramping without bleeding
  - Nausea and vomiting beyond first trimester
  - Hyperemesis gravidarum (severe morning sickness with dehydration)
  - Mild swelling of feet and ankles (without headache or high BP)
  - BP 140–160 systolic in a pregnant patient → gestational hypertension
  - UTI symptoms in pregnancy (higher risk of complications)
  - Gestational diabetes — elevated blood glucose, stable
  - Reduced fetal movement — uncertain (second trimester)
  - Mild fever 37.5–38.5°C in a pregnant patient

  RECOMMENDED SPECIALIZATION FOR PREGNANT PATIENTS:
  - Any RED pregnancy complication → Obstetrician / Gynecologist (emergency)
  - Any YELLOW pregnancy concern → Obstetrician / Gynecologist
  - Cardiac issue in pregnancy → Cardiologist + Obstetrician
  - Seizure in pregnancy → Neurologist + Obstetrician (eclampsia protocol)
  - Trauma in pregnancy → General Surgeon + Obstetrician

━━━━━━━━━━━━━━━━━━
COMBINED EXAMPLE INPUTS
━━━━━━━━━━━━━━━━━━

  "name: Priya, age: 28, gender: female, 32 weeks pregnant, vaginal bleeding, BP 150/100, HR 105"
  → pregnant: true, trimester: Third, priority: RED, specialization: Obstetrician / Gynecologist

  "naam Sunita hai, umar 25 saal, pet se hai 7 mahine ki, sar dard, ankhen dhundhli, BP 170/115"
  → pregnant: true, trimester: Third, eclampsia suspected, priority: RED, specialization: Obstetrician / Gynecologist

  "45M, chest pain, SOB, BP 180/110, HR 120"
  → gender: Male, pregnant: null, priority: RED, specialization: Cardiologist

  "female pt, 30 yrs, not pregnant, pet mein dard, ulti, dast, temp 38.7C"
  → gender: Female, pregnant: false, priority: YELLOW, specialization: Gastroenterologist
                """;

            String userMessage = "Clinical input: " + rawInput;

            // Build OpenAI-compatible chat completions request body
            Map<String, Object> systemMsg = new HashMap<>();
            systemMsg.put("role", "system");
            systemMsg.put("content", systemPrompt);

            Map<String, Object> userMsg = new HashMap<>();
            userMsg.put("role", "user");
            userMsg.put("content", userMessage);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", modelId);
            requestBody.put("messages", List.of(systemMsg, userMsg));
            requestBody.put("max_tokens", 512);
            requestBody.put("temperature", 0.1);

            String jsonBody = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest
                .newBuilder()
                .uri(URI.create(apiUrl))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

            logger.info(">>> Sending request to HuggingFace API: {} (model: {})", apiUrl, modelId);

            HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString()
            );

            // Log the raw response from HuggingFace
            logger.info("<<< HuggingFace API response status: {}", response.statusCode());
            logger.info("<<< HuggingFace API raw response body:\n{}", response.body());

            if (response.statusCode() != 200) {
                logger.error("HuggingFace API error: {} - {}", response.statusCode(), response.body());
                return localExtractorService.extract(rawInput);
            }

            // OpenAI-compatible response: { "choices": [{ "message": { "content": "..." } }] }
            JsonNode root = objectMapper.readTree(response.body());
            String generatedText;

            if (root.has("choices") && root.path("choices").isArray() && root.path("choices").size() > 0) {
                generatedText = root.path("choices").get(0).path("message").path("content").asText();
            } else if (root.isArray() && root.size() > 0) {
                // Legacy format fallback
                generatedText = root.get(0).path("generated_text").asText();
            } else {
                logger.warn("Unexpected HuggingFace response structure: {}", response.body());
                return localExtractorService.extract(rawInput);
            }

            logger.info("<<< HuggingFace generated text:\n{}", generatedText);

            // Clean up markdown code fences if present
            generatedText = generatedText.trim();
            if (generatedText.startsWith("```json")) generatedText =
                generatedText.substring(7);
            else if (generatedText.startsWith("```")) generatedText =
                generatedText.substring(3);
            if (generatedText.endsWith("```")) generatedText =
                generatedText.substring(0, generatedText.length() - 3);
            generatedText = generatedText.trim();

            // Extract JSON from the generated text (model may add text around it)
            int jsonStart = generatedText.indexOf('{');
            int jsonEnd = generatedText.lastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                generatedText = generatedText.substring(jsonStart, jsonEnd + 1);
            }

            logger.info("<<< Cleaned JSON to parse:\n{}", generatedText);

            JsonNode patientDataNode = objectMapper.readTree(generatedText);

            Map<String, Object> result = new HashMap<>();
            result.put("name", patientDataNode.path("name").asText("Unknown"));
            JsonNode ageNode = patientDataNode.path("age");
            result.put(
                "age",
                (ageNode.isMissingNode() || ageNode.isNull())
                    ? null
                    : ageNode.asInt()
            );
            result.put(
                "symptoms",
                patientDataNode.path("symptoms").asText("Not specified")
            );
            result.put("vitals", patientDataNode.path("vitals").asText("Not recorded"));
            result.put("priority", patientDataNode.path("priority").asText("GREEN"));
            result.put(
                "recommended_specialization",
                patientDataNode
                    .path("recommended_specialization")
                    .asText("Emergency Medicine")
            );
            result.put("gender", patientDataNode.path("gender").asText("Unknown"));
            result.put("pregnant", patientDataNode.path("pregnant").asBoolean(false));
            result.put("trimester", patientDataNode.path("trimester").asText(null));

            // Apply Gynac filtering for male patients if needed
            if ("Male".equalsIgnoreCase(String.valueOf(result.get("gender")))) {
                final List<String> gynacTerms = List.of("pregnant", "trimester", "pregnancy", "gestation", "obstetric", "gynec", "gynac", "uterus", "menstruation", "periods", "female-specific");
                String symptoms = String.valueOf(result.get("symptoms"));
                for (String term : gynacTerms) {
                    symptoms = symptoms.replaceAll("(?i)\\b" + term + "\\b", "");
                }
                symptoms = symptoms.replaceAll(",\\s*,", ",").replaceAll("^,|,$", "").replaceAll("\\s{2,}", " ").trim();
                result.put("symptoms", symptoms);
                result.put("pregnant", false);
                result.put("trimester", null);
            }

            logger.info("<<< HuggingFace extraction result: {}", result);
            return result;
        } catch (Exception e) {
            logger.error("Error calling HuggingFace API: {}", e.getMessage(), e);
            return localExtractorService.extract(rawInput);
        }
    }
}