import { 
  sequelize, 
  User, 
  DoctorProfile, 
  Appointment, 
  HealthArticle, 
  HealthRecord, 
  ActivityLog, 
  NotificationLog 
} from '../../models/index.js';

const seedDatabase = async () => {
  try {
    console.log('Clearing database tables...');
    await sequelize.sync({ force: true });
    console.log('Tables synced.');

    // 1. Seed Admins
    console.log('Seeding Admins...');
    const admins = await User.bulkCreate([
      {
        name: 'Primary Admin',
        email: 'admin.1@medicare.com',
        password: 'Admin@123',
        phone: '5550192834',
        role: 'ADMIN',
        status: 'active'
      },
      {
        name: 'Super Admin',
        email: 'admin.2@medicare.com',
        password: 'Admin@123',
        phone: '5550195678',
        role: 'ADMIN',
        status: 'active'
      }
    ], { individualHooks: true });

    // 2. Seed Doctors
    console.log('Seeding Doctors (30+)...');
    const doctorSpecs = [
      { specialty: 'Cardiology', names: ['Dr. Sarah Jenkins', 'Dr. Robert Chen', 'Dr. Anita Desai'] },
      { specialty: 'Neurology', names: ['Dr. Marcus Vance', 'Dr. Elena Rostova', 'Dr. David Kim'] },
      { specialty: 'Dermatology', names: ['Dr. Clara Dupont', 'Dr. Jordan Patel', 'Dr. Maya Lin'] },
      { specialty: 'Orthopedics', names: ['Dr. Thomas Miller', 'Dr. Samuel Jackson', 'Dr. Olivia Martinez'] },
      { specialty: 'Pediatrics', names: ['Dr. Emily Watson', 'Dr. James O\'Connor', 'Dr. Priya Sharma'] },
      { specialty: 'General Medicine', names: ['Dr. Alan Grant', 'Dr. Linda Brady', 'Dr. Kenji Sato', 'Dr. Sofia Rossi'] },
      { specialty: 'Psychiatry', names: ['Dr. Jonathan Crane', 'Dr. Karen Page', 'Dr. Bruce Banner'] },
      { specialty: 'Oncology', names: ['Dr. Charles Xavier', 'Dr. Stephen Strange', 'Dr. Reed Richards'] },
      { specialty: 'Ophthalmology', names: ['Dr. Scott Summers', 'Dr. Jean Grey'] },
      { specialty: 'Gastroenterology', names: ['Dr. Tony Stark', 'Dr. Pepper Potts'] },
      { specialty: 'Endocrinology', names: ['Dr. Hank Pym', 'Dr. Janet Van Dyne'] }
    ];

    const doctorUsers = [];
    const specialtiesList = [];
    let docIndex = 1;

    for (const specGroup of doctorSpecs) {
      for (const docName of specGroup.names) {
        const cleanName = docName.replace(/^Dr\.\s+/i, '').trim().toLowerCase();
        const email = `${cleanName.split(/\s+/).join('.')}@medicare.com`;
        doctorUsers.push({
          name: docName,
          email: email,
          password: 'Doctor@123',
          phone: `555020${(1000 + docIndex).toString().slice(-4)}`,
          role: 'DOCTOR',
          status: 'active'
        });
        specialtiesList.push(specGroup.specialty);
        docIndex++;
      }
    }

    const createdDoctorUsers = await User.bulkCreate(doctorUsers, { individualHooks: true });
    const doctorProfiles = [];

    // Gender-appropriate doctor profile images
    // Maps doctor name to gender for image assignment
    const getDoctorImageUrl = (name, index) => {
      // Female doctor images - professional medical portraits
      const femaleImages = [
        'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300', // Female doctor with stethoscope
        'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=300', // Female doctor smiling
        'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&q=80&w=300', // Female doctor portrait
        'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?auto=format&fit=crop&q=80&w=300', // Female medical professional
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300', // Professional woman
        'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?auto=format&fit=crop&q=80&w=300', // Female doctor in lab coat
        'https://images.unsplash.com/photo-1643297654416-05795d62e39c?auto=format&fit=crop&q=80&w=300', // Female healthcare worker
        'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=300', // Female nurse/doctor
      ];
      // Male doctor images - professional medical portraits  
      const maleImages = [
        'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300', // Male doctor with stethoscope
        'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300', // Male doctor portrait
        'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300', // Male doctor smiling
        'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=300', // Male medical professional
        'https://images.unsplash.com/photo-1618498082410-b4aa22193b38?auto=format&fit=crop&q=80&w=300', // Male doctor in clinic
        'https://images.unsplash.com/photo-1612349316228-5942a9b489c2?auto=format&fit=crop&q=80&w=300', // Male healthcare professional
        'https://images.unsplash.com/photo-1638202993928-7267aad84c31?auto=format&fit=crop&q=80&w=300', // Male doctor with clipboard
        'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=300', // Male doctor office
      ];

      // Determine gender from name
      const femaleNames = ['Sarah', 'Anita', 'Elena', 'Clara', 'Maya', 'Olivia', 'Emily', 'Priya', 'Linda', 'Sofia', 'Karen', 'Jean', 'Pepper', 'Janet'];
      const firstName = name.replace(/^Dr\.\s+/i, '').split(' ')[0];
      const isFemale = femaleNames.includes(firstName);

      if (isFemale) {
        return femaleImages[index % femaleImages.length];
      } else {
        return maleImages[index % maleImages.length];
      }
    };

    let femaleIdx = 0;
    let maleIdx = 0;

    for (let i = 0; i < createdDoctorUsers.length; i++) {
      const user = createdDoctorUsers[i];
      const specialty = specialtiesList[i];
      const exp = 5 + (i % 15); // 5 to 19 years of experience
      const bio = `${user.name} is a board-certified specialist in ${specialty} with over ${exp} years of clinical experience. Specializing in advanced diagnostics, patient-centric therapeutic options, and state-of-the-art care management. Published in several international medical journals and dedicated to preventative healthcare education.`;
      
      // Seed availability
      const availDays = ['Mon-Fri', 'Mon-Wed', 'Tue-Thu', 'Wed-Fri'][i % 4];
      const availHours = `${availDays} ${['9am-5pm', '8am-4pm', '10am-6pm', '9am-1pm'][i % 4]}`;

      // Determine gender-appropriate image
      const femaleNames = ['Sarah', 'Anita', 'Elena', 'Clara', 'Maya', 'Olivia', 'Emily', 'Priya', 'Linda', 'Sofia', 'Karen', 'Jean', 'Pepper', 'Janet'];
      const firstName = user.name.replace(/^Dr\.\s+/i, '').split(' ')[0];
      const isFemale = femaleNames.includes(firstName);
      const imageUrl = isFemale
        ? getDoctorImageUrl(user.name, femaleIdx++)
        : getDoctorImageUrl(user.name, maleIdx++);

      doctorProfiles.push({
        userId: user.id,
        specialization: specialty,
        experienceYears: exp,
        bio: bio,
        availabilityHours: availHours,
        isAvailable: true,
        imageUrl: imageUrl
      });
    }

    const createdDoctorProfiles = await DoctorProfile.bulkCreate(doctorProfiles);
    console.log(`Seeded ${createdDoctorProfiles.length} Doctor Profiles.`);

    // 3. Seed Staff (15+)
    console.log('Seeding Staff (15+)...');
    const staffUsers = [];
    for (let i = 1; i <= 15; i++) {
      staffUsers.push({
        name: `Staff Member ${i}`,
        email: `staff.${i}@medicare.com`,
        password: 'Staff@123',
        phone: `555030${(2000 + i).toString().slice(-4)}`,
        role: 'STAFF',
        status: 'active'
      });
    }
    const createdStaff = await User.bulkCreate(staffUsers, { individualHooks: true });
    console.log(`Seeded ${createdStaff.length} Staff accounts.`);

    // 4. Seed Patients (55+)
    console.log('Seeding Patients (55+)...');
    const patientUsers = [];
    const patientNames = [
      'John Doe', 'Jane Smith', 'Alice Johnson', 'Michael Brown', 'Emily Davis', 
      'David Wilson', 'Sarah Taylor', 'James Thomas', 'Patricia Jackson', 'Robert White',
      'Mary Harris', 'William Martin', 'Linda Thompson', 'Joseph Garcia', 'Barbara Martinez',
      'Thomas Robinson', 'Elizabeth Clark', 'Daniel Rodriguez', 'Jennifer Lewis', 'Matthew Lee',
      'Patricia Walker', 'Charles Hall', 'Susan Allen', 'Christopher Young', 'Jessica Hernandez',
      'Daniel King', 'Sarah Wright', 'Matthew Lopez', 'Nancy Hill', 'Donald Scott',
      'Sandra Green', 'Paul Adams', 'Ashley Baker', 'Mark Gonzalez', 'Kimberly Nelson',
      'George Carter', 'Emily Mitchell', 'Kenneth Perez', 'Donna Roberts', 'Steven Turner',
      'Carol Phillips', 'Edward Campbell', 'Amanda Parker', 'Brian Evans', 'Melissa Edwards',
      'Ronald Collins', 'Deborah Stewart', 'Timothy Sanchez', 'Stephanie Morris', 'Jason Rogers',
      'Rebecca Reed', 'Jeffrey Cook', 'Laura Morgan', 'Ryan Bell', 'Sharon Murphy'
    ];

    patientNames.forEach((name, idx) => {
      patientUsers.push({
        name: name,
        email: `patient.${idx + 1}@medicare.com`,
        password: 'Patient@123',
        phone: `555040${(3000 + idx + 1).toString().slice(-4)}`,
        role: 'PATIENT',
        status: 'active'
      });
    });

    const createdPatients = await User.bulkCreate(patientUsers, { individualHooks: true });
    console.log(`Seeded ${createdPatients.length} Patient accounts.`);

    // 5. Seed Appointments (60+)
    console.log('Seeding Appointments (60+)...');
    const appointments = [];
    const statuses = ['confirmed', 'cancelled'];
    const reasons = [
      'Annual health physical check-up', 'Frequent migraines and headaches',
      'Follow-up after laboratory blood test', 'Persistent lower back pain',
      'Sore throat and persistent cough', 'Skin rash and itching on arm',
      'Consultation on managing blood pressure', 'Routine check-up for pediatric patient',
      'Reviewing medication dosages', 'Anxiety and trouble sleeping'
    ];

    const today = new Date();

    for (let i = 0; i < 70; i++) {
      // Pick random patient & random doctor
      const patient = createdPatients[i % createdPatients.length];
      const doctorProf = createdDoctorProfiles[i % createdDoctorProfiles.length];

      // Schedule spread across past (-30 days) and future (+30 days)
      const offsetDays = (i % 2 === 0 ? -1 : 1) * (1 + (i % 28));
      const apptDate = new Date();
      apptDate.setDate(today.getDate() + offsetDays);

      const dateStr = apptDate.toISOString().split('T')[0];
      const timeStr = `${['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'][i % 6]}`;

      appointments.push({
        patientId: patient.id,
        doctorProfileId: doctorProf.id,
        appointmentDate: dateStr,
        appointmentTime: timeStr,
        reason: reasons[i % reasons.length],
        status: i % 10 === 0 ? 'cancelled' : 'confirmed', // 10% cancelled rate
      });
    }

    const createdAppointments = await Appointment.bulkCreate(appointments);
    console.log(`Seeded ${createdAppointments.length} Appointments.`);

    // 6. Seed Health Records (one for each patient)
    console.log('Seeding Health Records...');
    const records = [];
    const recordNames = ['Blood_Report_May.pdf', 'XRay_Chest_2025.png', 'Cardiology_Consult_Notes.pdf', 'Immunization_Record.pdf'];
    const recordTypes = ['application/pdf', 'image/png', 'application/pdf', 'application/pdf'];

    createdPatients.forEach((patient, idx) => {
      const typeIdx = idx % recordNames.length;
      records.push({
        userId: patient.id,
        fileName: recordNames[typeIdx],
        fileUrl: `/uploads/${recordNames[typeIdx]}`,
        fileType: recordTypes[typeIdx],
        uploadedAt: new Date(Date.now() - (idx * 3600000))
      });
    });

    const createdRecords = await HealthRecord.bulkCreate(records);
    console.log(`Seeded ${createdRecords.length} Health Records.`);

    // 7. Seed Health Articles (15+)
    console.log('Seeding Health Articles (15+)...');
    const articles = [
      {
        title: 'Preventing Cardiovascular Disease: Core Habits',
        category: 'prevention',
        content: `### Heart Health and Prevention

Cardiovascular disease remains the leading cause of death globally, but the majority of cases are highly preventable through structured lifestyle changes. Implementing these core habits daily can dramatically lower your risk profile.

1. **Adopt a Mediterranean Diet**: Focus on whole grains, fruits, vegetables, olive oil, and lean proteins like fish. Limit processed meats and refined sugars.
2. **Commit to Regular Exercise**: The American Heart Association recommends at least 150 minutes of moderate-intensity aerobic activity or 75 minutes of vigorous activity weekly.
3. **Monitor Blood Pressure**: Keep your blood pressure within a healthy range (typically under 120/80 mmHg). High blood pressure places undue stress on your arterial walls.
4. **Manage Chronic Stress**: Practices like mindfulness, meditation, and structured sleep hygiene reduce cortisol levels, protecting the heart muscle.

Consult your doctor before initiating any new vigorous exercise routines or intensive diets.`,
        symptoms: 'Shortness of breath, chest tightness, high fatigue',
        prevention: 'Regular exercise, low-sodium diet, stress mitigation, smoking cessation',
        published: true
      },
      {
        title: 'Recognizing Early Symptoms of Type 2 Diabetes',
        category: 'symptoms',
        content: `### Identifying the Signs of Insulin Resistance

Type 2 diabetes often develops slowly over years. In the early stages, symptoms may be so mild that you don't notice them. Recognizing these signals early can facilitate immediate intervention and reverse prediabetes status.

* **Increased Urination (Polyuria)**: When blood sugar is high, the kidneys work overtime to filter and absorb the excess glucose.
* **Persistent Thirst (Polydipsia)**: As a result of frequent urination, the body quickly becomes dehydrated.
* **Extreme Fatigue**: The body's cells are unable to absorb glucose properly for energy, leaving you feeling continually exhausted.
* **Blurry Vision**: Excess sugar damages the tiny blood vessels in the retina or draws fluid away from the lenses of your eyes.

A simple fasting blood glucose test can confirm diagnosis.`,
        symptoms: 'Frequent urination, excessive thirst, dry mouth, blurred vision',
        prevention: 'Maintain a healthy weight, reduce carbohydrate intake, stay active',
        published: true
      },
      {
        title: 'Nutritional Guide: Optimizing Gut Microbiome',
        category: 'nutrition',
        content: `### Fueling Your Gut Bacteria

The human gut contains trillions of microorganisms essential for digestion, immune function, and mental health. Optimizing this complex ecosystem requires a consistent intake of both prebiotics and probiotics.

#### Key Nutritional Pillars:
- **Prebiotics (Fiber Sources)**: Eat garlic, onions, leeks, asparagus, and bananas. These foods act as fuel for beneficial gut microbes.
- **Probiotics (Fermented Foods)**: Integrate yogurt, kefir, sauerkraut, kimchi, and kombucha to introduce live active cultures directly.
- **Diversify Fiber**: Aim for 30 different plant foods per week to nourish various distinct strains of gut bacteria.
- **Avoid Artificial Sweeteners**: Some studies suggest artificial sweeteners can negatively alter gut flora composition.`,
        symptoms: 'Bloating, irregular digestion, sugar cravings, fatigue',
        prevention: 'Incorporate fermented foods, increase daily fiber, limit processed foods',
        published: true
      },
      {
        title: 'Effective Aerobic and Strength Training Workouts',
        category: 'fitness',
        content: `### Balancing Endurance and Power

A balanced fitness routine incorporates both aerobic conditioning and muscular resistance training. This combination optimizes cardiovascular endurance, maintains joint stability, and prevents muscular atrophy.

#### Recommended Weekly Plan:
- **Cardiovascular Work (3-4 times/week)**: Jogging, cycling, swimming, or brisk walking. Keep heart rate in zones 2 or 3 for fat oxidation.
- **Strength Exercises (2-3 times/week)**: Focus on multi-joint compound movements like squats, deadlifts, chest presses, and rows.
- **Mobility and Flex**: Dedicate 10 minutes post-workout to stretching to improve range of motion and accelerate muscle recovery.`,
        symptoms: 'Muscle stiffness, joint cracking, low stamina, weight gain',
        prevention: 'Active warm-ups, progressive overload tracking, structured rest days',
        published: true
      },
      {
        title: 'Migraine Triggers and Prevention Strategies',
        category: 'diseases',
        content: `### Understanding the Neurological Impact of Migraines

Migraines are more than just bad headaches. They are a complex neurological condition characterized by throbbing pain, sensory sensitivity, and occasionally temporary visual disturbances (auras).

#### Common Triggers:
1. **Dietary Factors**: Aged cheeses, cured meats (containing nitrates), alcohol, and excess caffeine.
2. **Sensory Overload**: Bright lights, flickering screens, loud noises, and strong chemical smells.
3. **Hormonal Fluctuations**: Estrogen drops in women can prompt intense migraine episodes.
4. **Sleep Deprivation**: Irregular sleep-wake cycles disrupt neurological stability.

Maintaining a detailed migraine diary helps identify specific triggers.`,
        symptoms: 'Unilateral head throbbing, nausea, light/sound sensitivity, visual aura',
        prevention: 'Hydration, regular sleep schedule, identifying food allergies, stress control',
        published: true
      },
      {
        title: 'The Essential Role of Vitamin D in Immunity',
        category: 'nutrition',
        content: `### Vitamin D: The Hormone-Like Nutrient

Vitamin D acts as a major regulator of the immune system, enhancing the pathogen-fighting effects of monocytes and macrophages while decreasing inflammatory responses.

* **Sun Exposure**: Getting 15 minutes of direct sunlight daily helps synthesize Vitamin D.
* **Dietary Sources**: Fatty fish (salmon, tuna), egg yolks, and fortified milk.
* **Supplements**: Vitamin D3 (Cholecalciferol) supplementation is often necessary during winter months.`,
        symptoms: 'Frequent infections, muscle weakness, bone pain, depressive mood',
        prevention: 'Sun exposure, D3 supplementation, consuming fatty fish',
        published: true
      },
      {
        title: 'How to Build a Sustainable Sleep Hygiene Routine',
        category: 'prevention',
        content: `### Sleeping for Cell Regeneration

During sleep, your brain flushes out metabolic waste and consolidates memory, while your cardiovascular system rests and repairs. Quality sleep is essential to holistic wellness.

- **Set a Consistent Wake Time**: Wake up at the same hour every day, even on weekends.
- **Limit Blue Light**: Power down screens 1-2 hours before bed to allow melatonin production.
- **Cool Environment**: Keep your bedroom temperature around 65°F (18°C).
- **Avoid Late Stimulants**: Eliminate caffeine intake after 12:00 PM.`,
        symptoms: 'Daytime sleepiness, brain fog, irritability, dark eye circles',
        prevention: 'Set bedroom temperature low, block blue light, skip late caffeine',
        published: true
      },
      {
        title: 'Hypertension: The Silent Killer Explained',
        category: 'diseases',
        content: `### Understanding High Blood Pressure

Hypertension is commonly labeled the "silent killer" because it rarely presents obvious symptoms until it has caused damage to vital organs like the heart, kidneys, and blood vessels.

- **Risk Factors**: High sodium diet, lack of exercise, smoking, and genetics.
- **Complications**: Stroke, myocardial infarction, aneurysm, kidney disease.
- **Monitoring**: Take consistent readings at home and discuss deviations with a general practitioner.`,
        symptoms: 'Usually asymptomatic; severe hypertension may cause headaches, nosebleeds, or dizziness',
        prevention: 'DASH diet, daily sodium limit under 1500mg, aerobic workouts',
        published: true
      },
      {
        title: 'Symptom Review: When to Seek Immediate ER Care',
        category: 'symptoms',
        content: `### Distinguishing Urgent Care vs. Emergency Room

Understanding when a medical concern requires an Emergency Room (ER) visit versus an Urgent Care center can save lives and prevent massive medical billing surprises.

#### Visit the Emergency Room Immediately for:
- **Chest Pain**: Especially if spreading to the arm, neck, or jaw, or accompanied by sweating.
- **Difficulty Breathing**: Severe shortness of breath or sudden inability to speak.
- **Sudden Weakness or Numbness**: Especially on one side of the body, indicating a stroke.
- **Severe Head Injury**: With loss of consciousness, confusion, or vomiting.`,
        symptoms: 'Chest pain, sudden slurred speech, acute shortness of breath, sudden numbness',
        prevention: 'Keep emergency contact numbers handy, know nearest ER location',
        published: true
      },
      {
        title: 'Understanding Asthma Triggers and Management',
        category: 'diseases',
        content: `### Managing Chronic Airway Inflammation

Asthma is a chronic disease that causes inflammation and narrowing of the airways. While incurable, it can be managed effectively using rescue inhalers and daily controller medications.

- **Common Triggers**: Pollen, pet dander, cold air, dust mites, exercise.
- **Action Plan**: Keep a peak flow meter handy and establish clear red-yellow-green zones with your pulmonologist.`,
        symptoms: 'Wheezing, coughing, chest tightness, shortness of breath',
        prevention: 'Avoid known allergens, take daily controller inhalers, exercise in warm air',
        published: true
      },
      {
        title: 'Draft Article: Advanced Immunotherapy in Oncology',
        category: 'diseases',
        content: `### Emerging Cancer Therapies

Immunotherapy represents a paradigm shift in oncology. Unlike traditional chemotherapy which kills dividing cells directly, immunotherapy trains the patient's own immune system to identify and attack cancer cells.

Key classes of agents include checkpoint inhibitors, CAR-T cell therapies, and therapeutic vaccines. Research continues on optimizing combination protocols.`,
        symptoms: 'Systemic fatigue, unexplained weight loss, localized lumps',
        prevention: 'Avoid carcinogens, regular screenings, genetic counseling',
        published: false // Draft article
      },
      {
        title: 'Draft Article: High Protein Diets: Benefits and Risks',
        category: 'nutrition',
        content: `### Evaluating High Protein Intake

High protein diets are popular for weight management and bodybuilding. However, long-term excessive intake of certain animal proteins can stress kidney function in individuals with pre-existing renal conditions.

This draft article reviews ideal macro balances for different activity levels.`,
        symptoms: 'Kidney strain, dehydration, digestion issues',
        prevention: 'Balance protein with fiber and hydration, regular kidney panels',
        published: false // Draft article
      },
      {
        title: 'Understanding Anemia: Causes and Iron Intake',
        category: 'diseases',
        content: `### Iron Deficiency and Red Blood Cell Function

Anemia occurs when your blood has a lower than normal amount of healthy red blood cells or hemoglobin. Iron deficiency is the most common cause globally.

- **Sources of Iron**: Red meat, dark leafy greens, beans, and iron-fortified cereals.
- **Absorption Tip**: Pair iron-rich foods with Vitamin C (like citrus) to boost absorption rate.`,
        symptoms: 'Pale skin, fatigue, cold hands and feet, brittle nails',
        prevention: 'Eat iron-rich foods, avoid tea/coffee with meals, consider supplementation',
        published: true
      },
      {
        title: 'Joint Health: Exercises to Prevent Osteoarthritis',
        category: 'fitness',
        content: `### Protecting Your Cartilage

Osteoarthritis is a wear-and-tear condition that breaks down joint cartilage. Developing strong muscles surrounding your joints absorbs impact and reduces daily friction.

* **Low-Impact Workouts**: Swimming, stationary biking, and elliptical work.
* **Glute and Quad Strengthening**: Squats and leg lifts to stabilize knee joints.
* **Weight Management**: Every pound lost reduces four pounds of pressure on the knees.`,
        symptoms: 'Joint stiffness in morning, clicking joints, minor localized swelling',
        prevention: 'Low impact cross training, maintain ideal BMI, joint mobility warm-ups',
        published: true
      },
      {
        title: 'The Psychological Impact of Social Media on Teens',
        category: 'prevention',
        content: `### Digital Detox Strategies

Continuous social media browsing can trigger dopamine loops that exacerbate anxiety, sleep deprivation, and body dysmorphia in developing adolescents.

1. **Digital Curfews**: Set device lockouts after 9 PM.
2. **Analog Hobbies**: Promote face-to-face social and athletic activities.
3. **Parental Boundaries**: Monitor screen time stats together.`,
        symptoms: 'Disturbed sleep patterns, social withdrawal, constant device checking',
        prevention: 'Set screen limits, encourage offline activities, turn off alerts',
        published: true
      }
    ];

    const createdArticles = await HealthArticle.bulkCreate(articles);
    console.log(`Seeded ${createdArticles.length} Health Articles.`);

    // 8. Seed Activity Logs & Notification Logs (Initial logs)
    console.log('Seeding Activity and Notification logs...');
    const patientUserObj = createdPatients[0];
    const doctorUserObj = createdDoctorUsers[0];

    await ActivityLog.create({
      userId: patientUserObj.id,
      activityType: 'LOGIN',
      description: `Patient logged in from IP 192.168.1.10`,
      metadata: JSON.stringify({ browser: 'Chrome', os: 'Windows' })
    });

    await ActivityLog.create({
      userId: patientUserObj.id,
      activityType: 'APPOINTMENT_BOOK',
      description: `Booked appointment with ${doctorUserObj.name}`,
      metadata: JSON.stringify({ date: '2026-06-12', time: '10:00' })
    });

    await NotificationLog.create({
      userId: patientUserObj.id,
      type: 'app',
      event: 'APPOINTMENT_CONFIRMED',
      status: 'delivered',
      payload: JSON.stringify({ message: `Your appointment with ${doctorUserObj.name} is confirmed.` })
    });

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
