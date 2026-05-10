export type SearchResult = {
  question: string;
  answer: string;
  amendment?: string;
  caselaw?: string;
  tags: string[];
};

export const searchData: SearchResult[] = [
  {
    question: "Can police search my car?",
    answer:
      "Not without your consent, a warrant, or 'probable cause' — a reasonable belief based on specific facts that evidence of a crime is present. You have the right to clearly say: 'I do not consent to searches.' Refusing consent is not probable cause and cannot be used against you. If they search anyway, do not resist — challenge it in court.",
    amendment: "4th Amendment",
    caselaw: "Arizona v. Gant (2009) — limited vehicle searches after arrest",
    tags: ["search", "car", "vehicle", "consent", "4th amendment", "probable cause"],
  },
  {
    question: "Do I have to show ID?",
    answer:
      "It depends on the situation and your state. If you are DRIVING: yes, you must provide your license, registration, and insurance. If you are a PASSENGER or pedestrian: about 24 states have stop-and-identify laws requiring you to state your name when lawfully detained. You are generally never required to show a physical ID card unless you are driving.",
    amendment: "5th Amendment",
    tags: ["ID", "identification", "stop and identify", "driver's license"],
  },
  {
    question: "Can police take my phone?",
    answer:
      "Police cannot search your phone without a warrant. Riley v. California (2014) was a unanimous Supreme Court ruling that cell phones require a warrant to search. If arrested, police may seize your phone as evidence, but they cannot search its contents without a warrant. Never voluntarily unlock your phone for police.",
    amendment: "4th Amendment",
    caselaw: "Riley v. California (2014) — unanimous Supreme Court ruling",
    tags: ["phone", "cell phone", "warrant", "search", "digital"],
  },
  {
    question: "Can I record police?",
    answer:
      "Yes. The First Amendment protects the right to record police performing their duties in public spaces. Federal courts in every circuit have affirmed this right. You may record openly; you do not need to hide it. Police cannot legally order you to stop recording in public, delete footage, or seize your phone without a warrant. If threatened, calmly state: 'I have a First Amendment right to record police in public.'",
    amendment: "1st Amendment",
    tags: ["record", "camera", "video", "phone", "film", "photograph"],
  },
  {
    question: "Do I have to answer questions?",
    answer:
      "No. The 5th Amendment gives you the right to remain silent. You must explicitly invoke it by saying 'I invoke my right to remain silent.' Under Berghuis v. Thompkins (2010), simply staying quiet is not enough — you must say the words. After invoking, stop talking. Anything you say can and will be used against you — this applies to casual conversation too.",
    amendment: "5th Amendment",
    caselaw: "Berghuis v. Thompkins (2010)",
    tags: ["questions", "silence", "remain silent", "miranda", "interrogation"],
  },
  {
    question: "What is probable cause?",
    answer:
      "Probable cause is a reasonable belief, based on specific and articulable facts, that a crime has been committed. It is a higher standard than 'reasonable suspicion' (which allows a brief stop) but lower than 'beyond reasonable doubt' (required for conviction). Police need probable cause to arrest you or search without consent. Saying you look suspicious is NOT probable cause.",
    amendment: "4th Amendment",
    tags: ["probable cause", "arrest", "search", "suspicion"],
  },
  {
    question: "What is reasonable suspicion?",
    answer:
      "Reasonable suspicion is a lower standard than probable cause. It allows police to briefly stop and question you if they have specific, articulable facts suggesting criminal activity. Being Black in a certain neighborhood, wearing a hoodie, or 'looking nervous' alone do not constitute reasonable suspicion — though courts have often allowed broad interpretations. Document everything.",
    amendment: "4th Amendment",
    caselaw: "Terry v. Ohio (1968)",
    tags: ["reasonable suspicion", "stop", "detained", "terry stop"],
  },
  {
    question: "What are Miranda rights?",
    answer:
      "Miranda rights are warnings police must give before custodial interrogation: (1) You have the right to remain silent. (2) Anything you say can be used against you in court. (3) You have the right to an attorney. (4) If you cannot afford an attorney, one will be appointed. These rights apply when you are in custody AND being interrogated. You must explicitly invoke them.",
    amendment: "5th Amendment",
    caselaw: "Miranda v. Arizona (1966)",
    tags: ["miranda", "rights", "arrest", "attorney", "silent"],
  },
  {
    question: "What is qualified immunity?",
    answer:
      "Qualified immunity is a legal doctrine that shields government officials, including police, from civil lawsuits unless they violated a 'clearly established' statutory or constitutional right. In practice, it makes it very difficult to sue officers who violate your rights. Courts have ruled that rights must be established by prior case law in nearly identical circumstances — a nearly impossible standard.",
    tags: ["qualified immunity", "lawsuit", "civil rights", "police accountability"],
  },
  {
    question: "Can I sue if my rights were violated?",
    answer:
      "Yes, under 42 U.S.C. § 1983, you can sue government officials who violate your constitutional rights. However, qualified immunity makes this difficult (see above). You can also file complaints with: the police department's internal affairs division, your city's civilian oversight board, the FBI Civil Rights Division, and your state's attorney general. Civil rights attorneys often take these cases on contingency.",
    tags: ["sue", "lawsuit", "civil rights", "§1983", "complaint"],
  },
  {
    question: "Do I have to let police into my home?",
    answer:
      "No. Your home receives the highest 4th Amendment protection. Police cannot enter without: (1) a valid warrant, (2) your voluntary consent, or (3) true exigent circumstances (immediate emergency). You do not have to open your door. You can communicate through the closed door. Ask: 'Do you have a warrant?' If no warrant, say: 'I do not consent to entry.'",
    amendment: "4th Amendment",
    tags: ["home", "house", "door", "warrant", "entry", "consent"],
  },
  {
    question: "What should I do if I'm being arrested?",
    answer:
      "Do NOT resist — even if the arrest is unlawful. Clearly state: 'I am invoking my right to remain silent and my right to an attorney.' Do not answer any questions. Do not sign anything. Ask for your phone call. Contact an attorney or someone who can reach one. Your challenge to an unlawful arrest happens in court, not on the street.",
    amendment: "5th Amendment",
    tags: ["arrested", "arrest", "resisting", "attorney", "phone call"],
  },
  {
    question: "Can police lie to me?",
    answer:
      "Yes. In the United States, police are legally allowed to lie to suspects during interrogations — about evidence they have, about what witnesses said, about what co-defendants said. This is not true in many other countries. This is why you should never answer questions without an attorney present, even if you are innocent. 'The evidence is already against you' may be a complete lie.",
    tags: ["lie", "lying", "interrogation", "false evidence", "deception"],
  },
  {
    question: "What is stop and frisk?",
    answer:
      "Stop and frisk (a Terry stop) allows police to briefly detain you based on reasonable suspicion and pat down your outer clothing for weapons if they reasonably believe you are armed and dangerous. This is NOT a full search. They can only seize items immediately identifiable as contraband. Clearly state: 'I do not consent to this search' — it preserves your right to challenge it later.",
    amendment: "4th Amendment",
    caselaw: "Terry v. Ohio (1968)",
    tags: ["stop and frisk", "pat down", "terry stop", "frisk", "search"],
  },
];
