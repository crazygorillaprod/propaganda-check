export type EncounterStep = {
  number: number;
  heading: string;
  detail?: string;
  script?: string;
};

export type EncounterScript = {
  slug: string;
  title: string;
  emoji: string;
  shortDesc: string;
  steps: EncounterStep[];
  doNots: string[];
  rights: string[];
  rightsExplanation: string;
  stateNotes: string;
};

export const encounterScripts: Record<string, EncounterScript> = {
  "traffic-stop": {
    slug: "traffic-stop",
    title: "Traffic Stop",
    emoji: "🚗",
    shortDesc: "You are being pulled over while driving.",
    steps: [
      {
        number: 1,
        heading: "Pull over safely.",
        detail: "Signal, move right, stop the engine. Turn on your interior light at night.",
      },
      {
        number: 2,
        heading: "Hands visible on the steering wheel.",
        detail: "Keep them there until the officer approaches.",
      },
      {
        number: 3,
        heading: "Provide required documents when asked.",
        detail: "License, registration, proof of insurance.",
        script: "Officer, my registration is in the glove compartment. Is it okay if I retrieve it?",
      },
      {
        number: 4,
        heading: "If questioned beyond documents:",
        script: "I choose to remain silent and would like an attorney.",
      },
      {
        number: 5,
        heading: "If asked to consent to a vehicle search:",
        script: "I do not consent to searches.",
      },
      {
        number: 6,
        heading: "Stay calm. Do not exit unless instructed.",
        detail: "Comply with lawful orders. Challenge unlawful ones in court, not on the street.",
      },
    ],
    doNots: [
      "Make sudden movements without announcing them first",
      "Argue or resist, even if you know you're right",
      "Consent to a search — ever",
      "Lie to the officer",
      "Reach for anything without explicit permission",
      "Exit the vehicle unless ordered to",
    ],
    rights: ["4th Amendment", "5th Amendment"],
    rightsExplanation:
      "You must provide your license, registration, and insurance. You are NOT required to answer questions about where you're going, where you've been, or what you've been doing. The 4th Amendment protects you from unreasonable searches — you can refuse a search without probable cause. The 5th Amendment gives you the right to remain silent. Refusing a search is not probable cause.",
    stateNotes:
      "Stop-and-identify laws vary by state. In most states, drivers must identify themselves by license only. Some states require you to state your name if asked while detained. Check your state's specific law.",
  },

  "passenger-stop": {
    slug: "passenger-stop",
    title: "Passenger Stop",
    emoji: "🚌",
    shortDesc: "You are a passenger in a vehicle being pulled over.",
    steps: [
      {
        number: 1,
        heading: "Stay calm. Keep your hands visible.",
        detail: "Do not interfere with the driver's interaction with the officer.",
      },
      {
        number: 2,
        heading: "If an officer approaches your window, ask:",
        script: "Am I being detained, or am I free to go?",
      },
      {
        number: 3,
        heading: "If asked to identify yourself:",
        detail: "In many states, passengers are NOT required to show ID.",
        script: "Am I legally required to provide identification in this state?",
      },
      {
        number: 4,
        heading: "If questioned about the vehicle or its contents:",
        script: "I choose to remain silent.",
      },
      {
        number: 5,
        heading: "If asked to consent to a search of your person or bags:",
        script: "I do not consent to searches.",
      },
    ],
    doNots: [
      "Reach into the driver's space or touch the steering wheel",
      "Make sudden movements",
      "Answer questions about where you've been or what's in the car",
      "Consent to searches of your person or belongings",
      "Argue with officers",
    ],
    rights: ["4th Amendment", "5th Amendment"],
    rightsExplanation:
      "As a passenger, your rights differ from the driver's. A traffic stop does not automatically give police the right to search passengers or demand their ID in most states. You have the right to remain silent about anything beyond your name (where required). You can refuse a search of your person and belongings.",
    stateNotes:
      "Some states require ALL occupants to identify themselves during a traffic stop. California and New York generally do not require passengers to show ID. Know your state. The ACLU has state-by-state guides at aclu.org.",
  },

  "police-at-door": {
    slug: "police-at-door",
    title: "Police At Your Door",
    emoji: "🚪",
    shortDesc: "Police are knocking at your home.",
    steps: [
      {
        number: 1,
        heading: "Do NOT open the door.",
        detail: "You can communicate through the closed door. Opening creates ambiguity about consent to enter.",
      },
      {
        number: 2,
        heading: "Ask through the door:",
        script: "Who is it, and what is this regarding?",
      },
      {
        number: 3,
        heading: "If they identify as police, ask:",
        script: "Do you have a warrant?",
      },
      {
        number: 4,
        heading: "If they say no warrant:",
        script: "I do not consent to entry. If you have a warrant, please slide it under the door or hold it up to the window.",
      },
      {
        number: 5,
        heading: "Do not answer further questions:",
        script: "I am choosing to remain silent and would like to speak with an attorney.",
      },
      {
        number: 6,
        heading: "If they force entry anyway:",
        detail: "Do not resist. Comply. Say clearly: I do not consent to this entry. Document everything afterward.",
      },
    ],
    doNots: [
      "Open the door just because police knock — you are not required to",
      "Let them in without a valid warrant",
      "Consent to entry or searches",
      "Block or physically impede officers who have a valid warrant",
      "Lie about being home",
    ],
    rights: ["4th Amendment", "5th Amendment"],
    rightsExplanation:
      "Your home receives the highest 4th Amendment protection. Police generally cannot enter without: (1) a valid warrant, (2) your voluntary consent, or (3) true exigent circumstances (immediate emergency). You are NOT required to open your door or answer questions. If they claim exigent circumstances, document everything — you can challenge it in court.",
    stateNotes:
      "Exigent circumstances can justify warrantless entry in genuine emergencies — pursuing a fleeing violent suspect, preventing imminent harm, or preventing destruction of evidence. These exceptions are legally narrow. If police use them improperly, the evidence can be suppressed.",
  },

  "being-questioned": {
    slug: "being-questioned",
    title: "Being Questioned",
    emoji: "❓",
    shortDesc: "Police are questioning you on the street or in public.",
    steps: [
      {
        number: 1,
        heading: "Immediately and calmly ask:",
        script: "Am I being detained, or am I free to go?",
      },
      {
        number: 2,
        heading: "If free to go:",
        detail: "Calmly and slowly walk away. Do not run. Do not look back aggressively.",
      },
      {
        number: 3,
        heading: "If detained — invoke your rights clearly:",
        script: "I am invoking my right to remain silent. I would like an attorney.",
      },
      {
        number: 4,
        heading: "If in a stop-and-identify state, provide your name only:",
        detail: "Nothing more. No explanation of where you're going or why you're there.",
      },
      {
        number: 5,
        heading: "Repeat as necessary:",
        script: "I am exercising my right to remain silent.",
      },
    ],
    doNots: [
      "Run away from police — it gives them grounds to detain you",
      "Physically resist a lawful detention",
      "Try to explain yourself or 'clear things up'",
      "Answer questions about what you've been doing or where you're going",
      "Consent to searches",
    ],
    rights: ["4th Amendment", "5th Amendment", "6th Amendment"],
    rightsExplanation:
      "Police can briefly stop you with 'reasonable articulable suspicion' of criminal activity (a Terry stop). But you cannot be arrested without probable cause. You always have the right to remain silent — but since Berghuis v. Thompkins (2010), you must explicitly invoke it by saying 'I invoke my right to remain silent.' Staying silent alone is not enough.",
    stateNotes:
      "About 24 states have stop-and-identify laws that require you to state your name when lawfully detained. Not all states do. The ACLU has a complete list at aclu.org/know-your-rights.",
  },

  "stop-and-frisk": {
    slug: "stop-and-frisk",
    title: "Stop & Frisk",
    emoji: "✋",
    shortDesc: "Police have stopped you and want to pat you down.",
    steps: [
      {
        number: 1,
        heading: "Ask first:",
        script: "Am I being detained?",
      },
      {
        number: 2,
        heading: "Do NOT physically resist the pat-down. But clearly state:",
        script: "I do not consent to this search. I am not resisting, but I do not consent.",
      },
      {
        number: 3,
        heading: "Say nothing further beyond:",
        script: "I am exercising my right to remain silent.",
      },
      {
        number: 4,
        heading: "Record everything in your memory:",
        detail: "Officer's name, badge number, time, location, what was said. Write it down immediately after. This is critical for any legal challenge.",
      },
    ],
    doNots: [
      "Physically resist or fight back",
      "Reach into your own pockets suddenly",
      "Verbally consent — your objection on the record matters",
      "Argue about legality in the moment — challenge it in court",
    ],
    rights: ["4th Amendment", "5th Amendment"],
    rightsExplanation:
      "Under Terry v. Ohio (1968), police may pat down your outer clothing if they have reasonable articulable suspicion that you are armed and dangerous. This is a limited frisk for weapons — not a full search. They can only seize items immediately identifiable as contraband. Clearly stating non-consent preserves your right to challenge the stop in court.",
    stateNotes:
      "Stop-and-frisk practices vary dramatically. New York City significantly curtailed them after Floyd v. City of New York (2013). Local ACLU chapters track patterns in your city. If you are stopped repeatedly without cause, document and report it.",
  },

  "being-arrested": {
    slug: "being-arrested",
    title: "Being Arrested",
    emoji: "⛓️",
    shortDesc: "You are being placed under arrest.",
    steps: [
      {
        number: 1,
        heading: "Do NOT resist — even if the arrest is unlawful.",
        detail: "Resisting arrest is a separate criminal charge. Fight it in court, not on the street.",
      },
      {
        number: 2,
        heading: "Clearly and calmly state:",
        script: "I am invoking my right to remain silent and my right to an attorney.",
      },
      {
        number: 3,
        heading: "Do not answer ANY questions.",
        detail: "Including casual or friendly questions. Booking questions about name and DOB are generally required.",
      },
      {
        number: 4,
        heading: "At the station, repeat immediately:",
        script: "I want an attorney. I will not answer questions without an attorney present.",
      },
      {
        number: 5,
        heading: "Exercise your right to a phone call.",
        detail: "Contact an attorney or a trusted person who can reach one. Memorize the number — phones may be taken.",
      },
      {
        number: 6,
        heading: "Do not sign anything without an attorney.",
        detail: "Do not waive any rights on paper.",
      },
    ],
    doNots: [
      "Resist or fight back physically",
      "Try to explain yourself or 'clear things up' with officers",
      "Sign any documents without an attorney reviewing them",
      "Forget: everything you say will be recorded and used",
      "Trust that officers are your friends in this moment",
    ],
    rights: ["5th Amendment", "6th Amendment", "Miranda Rights"],
    rightsExplanation:
      "Miranda rights apply before custodial interrogation: you have the right to remain silent, the right to an attorney, and the right to a court-appointed attorney if you cannot afford one. These must be read before questioning — but you must invoke them explicitly. Public defenders are constitutionally guaranteed. Arraignment typically occurs within 24–72 hours depending on state law.",
    stateNotes:
      "If you cannot afford an attorney, one will be appointed for you — but ask for one explicitly and immediately. Some jurisdictions have public defender duty officers available 24/7. Bail is set at arraignment in most states. Bail funds exist in most major cities.",
  },
};

export const encounterList = [
  { slug: "traffic-stop", title: "Traffic Stop", emoji: "🚗" },
  { slug: "passenger-stop", title: "Passenger Stop", emoji: "🚌" },
  { slug: "police-at-door", title: "Police At Your Door", emoji: "🚪" },
  { slug: "being-questioned", title: "Being Questioned", emoji: "❓" },
  { slug: "stop-and-frisk", title: "Stop & Frisk", emoji: "✋" },
  { slug: "being-arrested", title: "Being Arrested", emoji: "⛓️" },
];
