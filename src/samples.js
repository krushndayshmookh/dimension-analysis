export const SAMPLE_QUESTIONS_CSV = `question_id,dimension,difficulty,topic,marks,expected_solve_rate
Q1,Recall,Beginner,Arrays & Strings,5,85
Q2,Recall,Easy,Complexity Analysis,5,75
Q3,Comprehend,Beginner,Arrays & Strings,10,80
Q4,Comprehend,Medium,Binary Trees,10,60
Q5,Solve,Easy,Arrays & Strings,10,75
Q6,Solve,Medium,Binary Trees,15,55
Q7,Solve,Hard,Graph Traversal,15,35
Q8,Build,Medium,Binary Trees,15,55
Q9,Build,Hard,Graph Traversal,15,35
Q10,Build,Challenge,Dynamic Programming,20,20
Q11,Evaluate,Medium,Complexity Analysis,10,50
Q12,Evaluate,Challenge,Dynamic Programming,15,20`

export const SAMPLE_STUDENTS_CSV = `student_id,name,email
S101,Ada Lovelace,ada@university.edu
S102,Alan Turing,alan@university.edu
S103,Grace Hopper,grace@university.edu
S104,Claude Shannon,claude@university.edu
S105,Donald Knuth,donald@university.edu
S106,Margaret Hamilton,margaret@university.edu
S107,John von Neumann,john@university.edu
S108,Katherine Johnson,katherine@university.edu`

export const SAMPLE_SCORES_CSV = `student_id,Q1,Q2,Q3,Q4,Q5,Q6,Q7,Q8,Q9,Q10,Q11,Q12
S101,5,5,10,10,10,14,13,15,14,18,9,14
S102,5,5,9,10,9,15,15,14,15,19,10,15
S103,5,4,10,9,8,12,11,15,13,16,8,11
S104,5,5,8,7,10,13,12,11,10,,9,8
S105,5,5,10,10,10,15,14,15,15,20,10,14
S106,4,4,9,9,9,13,12,15,14,17,8,
S107,5,5,10,10,10,15,15,15,15,19,10,15
S108,5,4,10,8,10,14,10,12,11,,,7`

export const SAMPLE_LONGITUDINAL_HISTORY = {
  S101: [
    {
      exam_id: 'exam-001',
      exam_title: 'Quiz 1 - Fundamentals',
      course_name: 'CS101 - Data Structures',
      date: '2026-08-15',
      earned: 42,
      total: 50,
      mastery_pct: 84.0,
      recall_pct: 90.0,
      comprehend_pct: 85.0,
      solve_pct: 82.0,
      build_pct: 80.0,
      evaluate_pct: 80.0,
      weakest_dimension: 'Build'
    },
    {
      exam_id: 'exam-002',
      exam_title: 'Midterm Exam - Trees & Graphs',
      course_name: 'CS101 - Data Structures',
      date: '2026-09-30',
      earned: 137,
      total: 145,
      mastery_pct: 94.5,
      recall_pct: 100.0,
      comprehend_pct: 100.0,
      solve_pct: 92.5,
      build_pct: 94.0,
      evaluate_pct: 92.0,
      weakest_dimension: 'Evaluate'
    }
  ],
  S102: [
    {
      exam_id: 'exam-001',
      exam_title: 'Quiz 1 - Fundamentals',
      course_name: 'CS101 - Data Structures',
      date: '2026-08-15',
      earned: 45,
      total: 50,
      mastery_pct: 90.0,
      recall_pct: 95.0,
      comprehend_pct: 90.0,
      solve_pct: 92.0,
      build_pct: 88.0,
      evaluate_pct: 92.0,
      weakest_dimension: 'Build'
    },
    {
      exam_id: 'exam-002',
      exam_title: 'Midterm Exam - Trees & Graphs',
      course_name: 'CS101 - Data Structures',
      date: '2026-09-30',
      earned: 141,
      total: 145,
      mastery_pct: 97.2,
      recall_pct: 100.0,
      comprehend_pct: 95.0,
      solve_pct: 97.5,
      build_pct: 96.0,
      evaluate_pct: 100.0,
      weakest_dimension: 'Comprehend'
    }
  ]
}

// --- 300-Student Contest Dataset (Generated via Monte Carlo Simulation) ---
export const CONTEST_QUESTIONS_CSV = `question_id,question_type,question_difficulty,question_dimension,question_topics,marks,expected_solve_rate
Q01,MCQ,beginner,Recall,Data Structures,2,88
Q02,MCQ,beginner,Recall,Computer Networks,2,85
Q03,MCQ,beginner,Recall,Operating Systems,2,85
Q04,MCQ,beginner,Comprehend,Databases,2,82
Q05,MCQ,easy,Recall,Algorithms,2,78
Q06,MCQ,easy,Recall,Data Structures,2,78
Q07,MCQ,easy,Comprehend,Operating Systems,2,75
Q08,MCQ,easy,Comprehend,Computer Networks,2,75
Q09,MCQ,easy,Recall,Databases,2,75
Q10,MCQ,easy,Comprehend,Algorithms,2,72
Q11,MCQ,easy,Recall,Operating Systems,4,72
Q12,MCQ,medium,Recall,Data Structures,4,68
Q13,MCQ,medium,Recall,Computer Networks,4,65
Q14,MCQ,medium,"Recall, Comprehend",Databases,4,65
Q15,MCQ,medium,"Recall, Comprehend",Algorithms,4,65
Q16,MCQ,medium,Comprehend,Data Structures,4,65
Q17,MCQ,medium,"Comprehend, Solve",Operating Systems,4,62
Q18,MCQ,medium,"Comprehend, Solve",Databases,4,58
Q19,MCQ,hard,Solve,Algorithms,4,35
Q20,MCQ,hard,Evaluate,Computer Networks,4,45
Q21,Coding,easy,Solve,Array Filtering & Aggregation,6,65
Q22,Coding,medium,"Solve, Build",Binary Search Tree Operations,8,55
Q23,Coding,medium,"Solve, Build",Graph Shortest Path,8,50
Q24,Coding,hard,"Solve, Evaluate",Dynamic Programming Optimization,8,55
Q25,Coding,challenge,"Solve, Evaluate",Distributed Cache Architecture,10,22`

export const CONTEST_STUDENTS_CSV = `student_id,student_name,email
STU001,Isaac Matsumoto,isaac.matsumoto@university.edu
STU002,Layla Matsumoto,layla.matsumoto@university.edu
STU003,Soren Ivanov,soren.ivanov@university.edu
STU004,Ada Gupta,ada.gupta@university.edu
STU005,Vikram Verma,vikram.verma@university.edu
STU006,Mina Hopper,mina.hopper@university.edu
STU007,Zoe Ortiz,zoe.ortiz@university.edu
STU008,Sara Acharya,sara.acharya@university.edu
STU009,Ibrahim Hopper,ibrahim.hopper@university.edu
STU010,Kiran Acharya,kiran.acharya@university.edu
STU011,Kevin Santos,kevin.santos@university.edu
STU012,Kwame Cruz,kwame.cruz@university.edu
STU013,Diana Diallo,diana.diallo@university.edu
STU014,Soren Nair,soren.nair@university.edu
STU015,Mei Al-Mansoor,mei.al.mansoor@university.edu
STU016,Claude Vargas,claude.vargas@university.edu
STU017,Liam Nakamura,liam.nakamura@university.edu
STU018,Soren Rao,soren.rao@university.edu
STU019,Pooja Becker,pooja.becker@university.edu
STU020,Julia Acharya,julia.acharya@university.edu
STU021,Imani Ortiz,imani.ortiz@university.edu
STU022,Dante Qureshi,dante.qureshi@university.edu
STU023,Malik Volkov,malik.volkov@university.edu
STU024,Lucas Kim,lucas.kim@university.edu
STU025,Elias Agarwal,elias.agarwal@university.edu
STU026,Yara Acharya,yara.acharya@university.edu
STU027,Johan Andersson,johan.andersson@university.edu
STU028,Gabriel Sorensen,gabriel.sorensen@university.edu
STU029,Sara Kowalski,sara.kowalski@university.edu
STU030,Grace Wang,grace.wang@university.edu
STU031,Nikolai Hernandez,nikolai.hernandez@university.edu
STU032,Sara Mehta,sara.mehta@university.edu
STU033,Pooja Zhang,pooja.zhang@university.edu
STU034,Margaret Hassan,margaret.hassan@university.edu
STU035,Grace Sorensen,grace.sorensen@university.edu
STU036,Ananya Lovelace,ananya.lovelace@university.edu
STU037,Chloe Wang,chloe.wang@university.edu
STU038,Priya Abadi,priya.abadi@university.edu
STU039,Lin Gupta,lin.gupta@university.edu
STU040,Johan Sharma,johan.sharma@university.edu
STU041,Aisha Jansen,aisha.jansen@university.edu
STU042,Julia Agarwal,julia.agarwal@university.edu
STU043,Lucas Hansen,lucas.hansen@university.edu
STU044,Grace Patel,grace.patel@university.edu
STU045,David Acharya,david.acharya@university.edu
STU046,Nina Qureshi,nina.qureshi@university.edu
STU047,Fatima Watanabe,fatima.watanabe@university.edu
STU048,Yara Becker,yara.becker@university.edu
STU049,Claude Williams,claude.williams@university.edu
STU050,Valerie Al-Mansoor,valerie.al.mansoor@university.edu
STU051,Johan Muller,johan.muller@university.edu
STU052,Diego Malik,diego.malik@university.edu
STU053,Yuki Rodriguez,yuki.rodriguez@university.edu
STU054,Elena Fernandez,elena.fernandez@university.edu
STU055,Alex Adeyemi,alex.adeyemi@university.edu
STU056,Beatriz Jansen,beatriz.jansen@university.edu
STU057,Vikram Gupta,vikram.gupta@university.edu
STU058,Mei Vargas,mei.vargas@university.edu
STU059,Liam Banerjee,liam.banerjee@university.edu
STU060,Nina Suzuki,nina.suzuki@university.edu
STU061,Mina Kim,mina.kim@university.edu
STU062,Ian Espinoza,ian.espinoza@university.edu
STU063,Kenji Fujimoto,kenji.fujimoto@university.edu
STU064,Anya Gomez,anya.gomez@university.edu
STU065,Chloe Wright,chloe.wright@university.edu
STU066,Rohan Kowalski,rohan.kowalski@university.edu
STU067,Kwame Vargas,kwame.vargas@university.edu
STU068,Katherine Cruz,katherine.cruz@university.edu
STU069,Kevin Andersson,kevin.andersson@university.edu
STU070,Wei Sato,wei.sato@university.edu
STU071,Soren Costa,soren.costa@university.edu
STU072,Leo Adeyemi,leo.adeyemi@university.edu
STU073,Rafael Weber,rafael.weber@university.edu
STU074,Yuki Miller,yuki.miller@university.edu
STU075,David Novak,david.novak@university.edu
STU076,Anya Miller,anya.miller@university.edu
STU077,Beatriz Mensah,beatriz.mensah@university.edu
STU078,Yuki Tanaka,yuki.tanaka@university.edu
STU079,Julia Adeyemi,julia.adeyemi@university.edu
STU080,Liam Watanabe,liam.watanabe@university.edu
STU081,Diana Volkov,diana.volkov@university.edu
STU082,Yara Espinoza,yara.espinoza@university.edu
STU083,Ananya Qureshi,ananya.qureshi@university.edu
STU084,Katherine O'Connor,katherine.o.connor@university.edu
STU085,Kai Castillo,kai.castillo@university.edu
STU086,Nikolai Gupta,nikolai.gupta@university.edu
STU087,Andre Diallo,andre.diallo@university.edu
STU088,Maria Mensah,maria.mensah@university.edu
STU089,Hiroshi Mehta,hiroshi.mehta@university.edu
STU090,Zoe Adeyemi,zoe.adeyemi@university.edu
STU091,Sofia Lin,sofia.lin@university.edu
STU092,Tariq Matsumoto,tariq.matsumoto@university.edu
STU093,Kai Malik,kai.malik@university.edu
STU094,Pooja Gomez,pooja.gomez@university.edu
STU095,Elias Rodriguez,elias.rodriguez@university.edu
STU096,Aisha Pereira,aisha.pereira@university.edu
STU097,Tariq Andersson,tariq.andersson@university.edu
STU098,Sofia Turing,sofia.turing@university.edu
STU099,Lucia Jansen,lucia.jansen@university.edu
STU100,Chloe Hopper,chloe.hopper@university.edu
STU101,Lucia Weber,lucia.weber@university.edu
STU102,Alan Weber,alan.weber@university.edu
STU103,Aisha Ortiz,aisha.ortiz@university.edu
STU104,Dev Singh,dev.singh@university.edu
STU105,Soren Mensah,soren.mensah@university.edu
STU106,Rafael Patel,rafael.patel@university.edu
STU107,Zoe Park,zoe.park@university.edu
STU108,Ravi Adeyemi,ravi.adeyemi@university.edu
STU109,Nikolai Williams,nikolai.williams@university.edu
STU110,Liam Sen,liam.sen@university.edu
STU111,Carlos Abe,carlos.abe@university.edu
STU112,Rafael Turing,rafael.turing@university.edu
STU113,Carlos Silva,carlos.silva@university.edu
STU114,Alan Ortiz,alan.ortiz@university.edu
STU115,Yuki Morales,yuki.morales@university.edu
STU116,Imani Li,imani.li@university.edu
STU117,Andre Hernandez,andre.hernandez@university.edu
STU118,Lin Turing,lin.turing@university.edu
STU119,Dante Fischer,dante.fischer@university.edu
STU120,Pooja Acharya,pooja.acharya@university.edu
STU121,Tomas Gomez,tomas.gomez@university.edu
STU122,Diana Williams,diana.williams@university.edu
STU123,Laura Larsen,laura.larsen@university.edu
STU124,Nikolai Wang,nikolai.wang@university.edu
STU125,Mei Matsumoto,mei.matsumoto@university.edu
STU126,Kevin Li,kevin.li@university.edu
STU127,Kai Singh,kai.singh@university.edu
STU128,Kenji Mahmood,kenji.mahmood@university.edu
STU129,Ada Lovelace,ada.lovelace@university.edu
STU130,Pooja Dubois,pooja.dubois@university.edu
STU131,Ian Fernandez,ian.fernandez@university.edu
STU132,Maya Sharma,maya.sharma@university.edu
STU133,Dante Watanabe,dante.watanabe@university.edu
STU134,Claude Alvarez,claude.alvarez@university.edu
STU135,Isaac Singh,isaac.singh@university.edu
STU136,Malik Alvarez,malik.alvarez@university.edu
STU137,Zoe Gomez,zoe.gomez@university.edu
STU138,Mei Muller,mei.muller@university.edu
STU139,Gabriel Costa,gabriel.costa@university.edu
STU140,Jasmine Bacon,jasmine.bacon@university.edu
STU141,Beatriz Bhardwaj,beatriz.bhardwaj@university.edu
STU142,Margaret Abadi,margaret.abadi@university.edu
STU143,Alex Rossi,alex.rossi@university.edu
STU144,Fiona Larsen,fiona.larsen@university.edu
STU145,Katherine Rao,katherine.rao@university.edu
STU146,Claude Malik,claude.malik@university.edu
STU147,Andre Cruz,andre.cruz@university.edu
STU148,Amara Bhardwaj,amara.bhardwaj@university.edu
STU149,Leo Valdez,leo.valdez@university.edu
STU150,Mina Sharma,mina.sharma@university.edu
STU151,Alex Santos,alex.santos@university.edu
STU152,Andre Abadi,andre.abadi@university.edu
STU153,Jasmine Rao,jasmine.rao@university.edu
STU154,Beatriz Sato,beatriz.sato@university.edu
STU155,Katherine Ortiz,katherine.ortiz@university.edu
STU156,Tomas Sato,tomas.sato@university.edu
STU157,David Sen,david.sen@university.edu
STU158,Hannah Zhang,hannah.zhang@university.edu
STU159,Ananya Espinoza,ananya.espinoza@university.edu
STU160,Nina Fujimoto,nina.fujimoto@university.edu
STU161,Imani Kumar,imani.kumar@university.edu
STU162,Tomas Rahman,tomas.rahman@university.edu
STU163,Laura Muller,laura.muller@university.edu
STU164,Siddharth Park,siddharth.park@university.edu
STU165,Hiroshi Lee,hiroshi.lee@university.edu
STU166,Jasmine Kaur,jasmine.kaur@university.edu
STU167,Kai Lin,kai.lin@university.edu
STU168,Felix Nair,felix.nair@university.edu
STU169,Ian Rahman,ian.rahman@university.edu
STU170,Dante Verma,dante.verma@university.edu
STU171,Aisha Singh,aisha.singh@university.edu
STU172,Liam Lovelace,liam.lovelace@university.edu
STU173,Carlos Lin,carlos.lin@university.edu
STU174,Siddharth Bhardwaj,siddharth.bhardwaj@university.edu
STU175,Alan Novak,alan.novak@university.edu
STU176,Gabriel Fernandez,gabriel.fernandez@university.edu
STU177,Dante Lindqvist,dante.lindqvist@university.edu
STU178,Kiran Singh,kiran.singh@university.edu
STU179,Kenji Malik,kenji.malik@university.edu
STU180,Malik Lindqvist,malik.lindqvist@university.edu
STU181,Tenzin Al-Mansoor,tenzin.al.mansoor@university.edu
STU182,Tariq Mehta,tariq.mehta@university.edu
STU183,Kenji Williams,kenji.williams@university.edu
STU184,Gabriel Hernandez,gabriel.hernandez@university.edu
STU185,Fatima Al-Mansoor,fatima.al.mansoor@university.edu
STU186,Isaac Pereira,isaac.pereira@university.edu
STU187,Sanjay Singh,sanjay.singh@university.edu
STU188,Maya Chen,maya.chen@university.edu
STU189,Hannah Lindqvist,hannah.lindqvist@university.edu
STU190,Sara Patel,sara.patel@university.edu
STU191,Katherine Turing,katherine.turing@university.edu
STU192,David Kamau,david.kamau@university.edu
STU193,Kwame Park,kwame.park@university.edu
STU194,Amara Santos,amara.santos@university.edu
STU195,Sanjay Sharma,sanjay.sharma@university.edu
STU196,Chloe Agarwal,chloe.agarwal@university.edu
STU197,Mina Martinez,mina.martinez@university.edu
STU198,Ananya Matsumoto,ananya.matsumoto@university.edu
STU199,Mateo Okafor,mateo.okafor@university.edu
STU200,Elias Andersson,elias.andersson@university.edu
STU201,Nikolai Agarwal,nikolai.agarwal@university.edu
STU202,Aarav Rao,aarav.rao@university.edu
STU203,Carlos Gomez,carlos.gomez@university.edu
STU204,Andre Gupta,andre.gupta@university.edu
STU205,Nina Wright,nina.wright@university.edu
STU206,Felix Sato,felix.sato@university.edu
STU207,Hiroshi Kim,hiroshi.kim@university.edu
STU208,Laura Rao,laura.rao@university.edu
STU209,Ravi Santos,ravi.santos@university.edu
STU210,Kevin Wright,kevin.wright@university.edu
STU211,Kenji Rossi,kenji.rossi@university.edu
STU212,Grace Morales,grace.morales@university.edu
STU213,Liam Hansen,liam.hansen@university.edu
STU214,Soren Fujimoto,soren.fujimoto@university.edu
STU215,Yara Ortiz,yara.ortiz@university.edu
STU216,Sara Gupta,sara.gupta@university.edu
STU217,Nina Muller,nina.muller@university.edu
STU218,Anya Mahmood,anya.mahmood@university.edu
STU219,Dante Yang,dante.yang@university.edu
STU220,Ada Schneider,ada.schneider@university.edu
STU221,Imani Garcia,imani.garcia@university.edu
STU222,Ibrahim Watanabe,ibrahim.watanabe@university.edu
STU223,Dante Nakamura,dante.nakamura@university.edu
STU224,Sanjay Al-Mansoor,sanjay.al.mansoor@university.edu
STU225,Nathan Becker,nathan.becker@university.edu
STU226,Nikolai Okafor,nikolai.okafor@university.edu
STU227,Kevin Smith,kevin.smith@university.edu
STU228,Leo Espinoza,leo.espinoza@university.edu
STU229,Nikolai Singh,nikolai.singh@university.edu
STU230,Imani Zhang,imani.zhang@university.edu
STU231,Margaret Acharya,margaret.acharya@university.edu
STU232,Alan Banerjee,alan.banerjee@university.edu
STU233,Lucas Andersson,lucas.andersson@university.edu
STU234,Nathan Schneider,nathan.schneider@university.edu
STU235,Diana Jansen,diana.jansen@university.edu
STU236,Aarav Weber,aarav.weber@university.edu
STU237,Alan Hopper,alan.hopper@university.edu
STU238,Hannah Ortiz,hannah.ortiz@university.edu
STU239,Ada Al-Mansoor,ada.al.mansoor@university.edu
STU240,Layla Nair,layla.nair@university.edu
STU241,Sanjay Patel,sanjay.patel@university.edu
STU242,Omar Mensah,omar.mensah@university.edu
STU243,Layla Khan,layla.khan@university.edu
STU244,Yuki Lindqvist,yuki.lindqvist@university.edu
STU245,Imani Gomez,imani.gomez@university.edu
STU246,Rohan Gupta,rohan.gupta@university.edu
STU247,Hannah Bacon,hannah.bacon@university.edu
STU248,Hiroshi Espinoza,hiroshi.espinoza@university.edu
STU249,Sofia Hansen,sofia.hansen@university.edu
STU250,Siddharth Malik,siddharth.malik@university.edu
STU251,Margaret Sorensen,margaret.sorensen@university.edu
STU252,Chloe Watanabe,chloe.watanabe@university.edu
STU253,Hana Malik,hana.malik@university.edu
STU254,Mei Johnson,mei.johnson@university.edu
STU255,Yara Jansen,yara.jansen@university.edu
STU256,Sanjay Acharya,sanjay.acharya@university.edu
STU257,Mateo Malik,mateo.malik@university.edu
STU258,Vikram Malik,vikram.malik@university.edu
STU259,Samira Mehta,samira.mehta@university.edu
STU260,Alex Chowdhury,alex.chowdhury@university.edu
STU261,Kwame Yamamoto,kwame.yamamoto@university.edu
STU262,Beatriz Valdez,beatriz.valdez@university.edu
STU263,Kevin Becker,kevin.becker@university.edu
STU264,Pooja Schneider,pooja.schneider@university.edu
STU265,Dante Reyes,dante.reyes@university.edu
STU266,Hana Volkov,hana.volkov@university.edu
STU267,Siddharth Johnson,siddharth.johnson@university.edu
STU268,Chen Silva,chen.silva@university.edu
STU269,Claude Mahmood,claude.mahmood@university.edu
STU270,Zoe Abadi,zoe.abadi@university.edu
STU271,Johan Rao,johan.rao@university.edu
STU272,Tenzin Miller,tenzin.miller@university.edu
STU273,Rohan Hernandez,rohan.hernandez@university.edu
STU274,Ian Jansen,ian.jansen@university.edu
STU275,Fatima Patel,fatima.patel@university.edu
STU276,Nikolai Dubois,nikolai.dubois@university.edu
STU277,Felix Reyes,felix.reyes@university.edu
STU278,Gabriel Nakamura,gabriel.nakamura@university.edu
STU279,Hannah Nguyen,hannah.nguyen@university.edu
STU280,Soren Abadi,soren.abadi@university.edu
STU281,Soren Watanabe,soren.watanabe@university.edu
STU282,Sofia Bacon,sofia.bacon@university.edu
STU283,Tomas Muller,tomas.muller@university.edu
STU284,Beatriz Rossi,beatriz.rossi@university.edu
STU285,Mei Schneider,mei.schneider@university.edu
STU286,Lucia Kamau,lucia.kamau@university.edu
STU287,Fatima Malik,fatima.malik@university.edu
STU288,Alex Schneider,alex.schneider@university.edu
STU289,Dev Sorensen,dev.sorensen@university.edu
STU290,Tenzin Kruger,tenzin.kruger@university.edu
STU291,Omar Novak,omar.novak@university.edu
STU292,Elena Diallo,elena.diallo@university.edu
STU293,Chen Rossi,chen.rossi@university.edu
STU294,Vikram Hopper,vikram.hopper@university.edu
STU295,Maya Gomez,maya.gomez@university.edu
STU296,Mina Larsen,mina.larsen@university.edu
STU297,Chen Wang,chen.wang@university.edu
STU298,Zoe Williams,zoe.williams@university.edu
STU299,Margaret Agarwal,margaret.agarwal@university.edu
STU300,Elias Wang,elias.wang@university.edu`

export const CONTEST_SCORES_CSV = `student_id,Q01,Q02,Q03,Q04,Q05,Q06,Q07,Q08,Q09,Q10,Q11,Q12,Q13,Q14,Q15,Q16,Q17,Q18,Q19,Q20,Q21,Q22,Q23,Q24,Q25
STU001,2,2,2,2,0,2,0,2,2,2,4,0,4,4,4,4,0,4,0,4,3.5,8,8,8,5
STU002,0,0,0,0,0,0,2,2,0,0,0,0,4,0,4,0,4,0,0,0,3,8,3,8,3
STU003,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,4,6,4,4,4,5
STU004,0,0,2,2,0,2,2,0,2,0,4,0,4,4,0,4,0,0,0,0,3,3,4,,4
STU005,2,2,2,2,2,2,0,0,2,2,4,0,4,4,4,4,4,4,0,0,3,8,3,8,3
STU006,2,0,2,2,2,2,0,2,0,0,0,4,4,0,4,0,4,4,4,0,3.5,8,4,4,5
STU007,0,2,0,2,2,2,0,2,2,2,4,4,4,0,0,0,4,0,0,0,6,4,8,4,5
STU008,2,2,2,2,2,2,0,2,0,0,4,4,4,0,4,0,4,4,4,4,3.5,8,8,8,5
STU009,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,4,6,8,8,8,10
STU010,0,0,2,0,2,2,0,2,0,0,4,0,0,4,0,0,0,0,4,0,6,3,4,4,3
STU011,2,2,2,0,0,0,0,0,2,2,0,4,0,0,4,4,4,0,4,4,4,5,8,4,5
STU012,2,2,2,2,2,2,0,0,2,2,4,0,4,0,0,0,4,4,4,0,6,4,4,4,4
STU013,2,2,2,0,2,2,2,2,2,0,4,4,4,4,4,4,4,0,0,0,6,8,5,5,4
STU014,2,2,0,2,0,2,2,2,2,2,4,4,4,4,0,0,4,4,0,4,6,4,8,8,4
STU015,2,2,0,2,2,2,2,2,2,2,4,0,4,0,4,4,4,4,0,4,4,5.5,8,5,10
STU016,0,2,2,2,2,0,2,2,0,0,4,0,0,4,0,4,4,4,4,4,3,4,8,3,5
STU017,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,4,6,5.5,8,8,10
STU018,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,0,0,4,4,5.5,5.5,4,4
STU019,2,2,2,2,0,0,2,2,2,2,4,0,0,4,0,4,0,4,0,4,6,8,5,3,5
STU020,2,2,2,2,2,2,2,2,2,2,4,4,0,4,0,4,0,0,4,0,4,4,8,8,4
STU021,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,4,6,5.5,8,8,5
STU022,2,2,2,0,0,2,2,2,2,0,4,4,0,4,4,4,0,4,0,0,6,8,4,4,4
STU023,2,2,0,2,2,0,2,2,2,2,0,4,0,4,4,0,4,4,4,4,3,8,4,8,4
STU024,2,2,2,0,2,2,2,2,2,2,0,4,4,0,0,0,4,0,0,0,3.5,4,5,3,4
STU025,2,2,2,2,2,2,2,2,2,2,4,0,0,4,4,0,4,4,4,4,6,5.5,5.5,4,5
STU026,0,2,2,2,2,2,0,0,2,2,4,0,4,4,4,4,0,4,0,0,3,3,3,3,4
STU027,2,2,2,2,2,2,2,2,2,2,4,4,0,4,0,4,4,4,4,4,6,8,5.5,8,5
STU028,0,2,2,0,2,0,2,2,2,2,4,4,4,4,4,0,4,4,0,4,6,5,8,3,5
STU029,2,2,2,2,0,2,2,2,2,0,4,4,4,4,4,4,4,4,4,4,6,8,8,8,10
STU030,2,0,2,2,2,2,0,2,2,2,4,4,4,4,4,4,0,0,4,4,6,5,4,4,4
STU031,2,2,0,0,0,2,0,2,2,2,4,4,4,4,0,4,4,0,0,0,2.5,8,3,4,
STU032,2,2,2,2,0,2,2,2,2,2,4,4,4,0,4,0,4,0,4,4,6,5.5,8,8,10
STU033,2,2,2,2,2,2,2,2,0,0,4,4,0,0,4,0,4,4,4,0,6,8,8,5,10
STU034,2,2,2,0,2,2,2,2,2,2,0,4,4,4,4,4,4,4,0,0,3.5,8,5.5,8,6
STU035,2,2,0,2,2,0,2,2,0,0,4,0,4,0,0,0,4,4,0,4,3,4,4,3,5
STU036,2,2,2,2,2,2,2,2,0,0,4,4,0,4,0,4,4,4,4,4,6,4,5,5,5
STU037,2,0,2,2,0,2,0,0,0,2,0,4,4,0,4,0,0,4,0,0,2.5,4,3,3,3
STU038,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,0,4,6,8,8,4,5
STU039,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,4,6,8,8,8,6
STU040,2,0,0,0,0,0,0,0,0,2,0,0,4,4,4,4,4,0,0,4,3,3,4,4,5
STU041,2,2,2,2,2,2,2,2,2,2,0,4,4,4,0,4,0,0,0,0,6,4,5,3,4
STU042,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,0,0,4,4,3.5,4,4,8,4
STU043,2,2,2,2,0,2,2,2,2,2,4,4,4,4,4,0,4,4,4,4,3.5,5,8,8,4
STU044,2,2,2,0,2,2,0,2,2,2,4,0,4,0,4,0,4,4,0,0,6,4,8,4,4
STU045,2,2,2,0,2,2,2,2,2,0,4,4,0,4,0,4,4,4,4,0,3,8,4,4,4
STU046,2,2,2,2,2,2,2,0,2,2,4,4,4,4,0,0,0,0,4,4,6,5,5,5,4
STU047,2,2,0,2,2,2,0,2,2,0,0,4,0,0,4,4,0,4,0,4,6,4,8,3,5
STU048,2,2,2,2,2,2,2,2,2,2,0,4,4,4,0,0,0,4,0,4,6,4,4,4,4
STU049,2,2,2,2,2,2,2,2,2,0,4,4,4,4,4,0,4,4,4,4,6,8,5,4,5
STU050,2,2,2,2,2,2,0,2,2,2,4,4,4,4,0,0,0,4,4,4,4,8,8,4,10
STU051,2,2,2,2,2,2,2,2,0,2,4,4,4,4,4,4,4,4,4,0,4,8,8,4,4
STU052,2,0,2,2,2,0,0,2,2,2,0,4,4,4,0,0,0,0,4,0,6,4,8,4,
STU053,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,0,4,3.5,8,8,8,6
STU054,2,2,2,2,2,2,2,0,2,2,4,4,4,4,4,0,4,4,0,0,4,8,8,8,10
STU055,2,2,0,2,2,0,0,2,2,2,4,0,4,4,0,4,4,4,4,4,6,8,8,4,10
STU056,2,2,2,2,2,2,2,2,2,0,4,0,4,0,4,0,0,4,4,4,3.5,5,8,4,5
STU057,2,2,2,2,2,0,2,2,2,2,0,4,0,4,4,4,4,0,4,4,6,5,5,8,4
STU058,2,2,0,2,2,2,2,0,0,2,4,0,4,4,0,4,4,4,4,0,3.5,4,8,4,5
STU059,2,2,2,2,2,2,2,0,0,0,0,0,0,4,4,4,4,4,0,4,3.5,4,8,3,4
STU060,2,2,2,0,2,0,0,2,0,0,0,0,0,4,0,0,0,0,4,0,2,3,4,4,4
STU061,2,2,2,2,2,2,2,2,2,2,0,4,4,0,4,4,4,0,4,4,6,8,8,4,5
STU062,2,0,0,2,2,2,2,2,2,2,4,0,0,0,4,4,4,0,0,4,6,4,5,3,4
STU063,2,2,0,2,2,0,0,2,0,0,0,0,0,4,0,0,4,0,4,4,3,8,3,4,3
STU064,2,2,2,2,2,2,2,2,2,2,0,4,0,0,4,4,0,4,4,4,3.5,8,3,4,5
STU065,2,2,2,2,0,2,2,0,0,2,4,4,4,4,4,0,4,0,0,0,3.5,8,3,8,4
STU066,2,0,0,0,0,0,2,0,2,2,0,0,4,0,4,4,0,4,0,0,3,4,3,3,4
STU067,2,0,0,2,2,0,2,2,2,2,0,0,4,4,4,4,4,0,0,4,6,4,3,8,3
STU068,2,2,2,2,2,0,2,2,2,0,0,0,0,4,4,4,4,4,4,0,6,8,5,8,10
STU069,2,2,2,2,2,2,2,2,2,2,4,0,0,0,4,4,0,4,0,4,2.5,8,8,3,3
STU070,2,0,2,2,2,2,2,2,0,0,0,0,0,4,4,4,4,4,0,4,6,8,4,8,5
STU071,2,2,2,2,0,2,2,2,0,2,4,4,4,4,4,4,0,4,0,0,4,5,5,8,4
STU072,2,2,0,2,2,2,2,0,2,0,4,4,4,4,0,0,4,0,4,0,3,8,8,3,4
STU073,2,2,2,2,0,2,2,0,2,2,4,4,4,4,4,4,4,4,0,4,6,8,5.5,8,10
STU074,2,2,2,2,0,0,2,0,2,2,4,4,4,4,0,4,4,0,4,0,6,5,4,3,4
STU075,2,2,2,2,2,2,2,2,2,2,0,4,4,4,4,0,4,4,4,4,6,4,5,3,10
STU076,0,2,2,2,0,2,2,2,0,2,4,0,0,0,4,4,0,4,0,4,3,5,8,5,5
STU077,2,2,2,2,0,0,2,2,0,2,4,0,4,4,4,4,0,4,0,4,6,8,5,4,5
STU078,2,2,2,2,2,2,2,2,0,2,4,4,4,4,0,0,0,4,4,0,6,8,8,8,6
STU079,2,2,2,0,2,0,2,2,2,2,4,0,4,4,4,4,0,4,4,0,3.5,5,5,8,4
STU080,2,2,2,2,2,2,2,2,2,0,4,0,4,4,4,4,0,4,0,0,6,8,5,4,5
STU081,2,2,0,2,2,2,0,2,2,2,4,4,4,4,4,4,4,4,4,4,6,8,5,8,10
STU082,2,2,2,0,0,2,2,2,2,2,4,4,0,0,0,0,0,0,0,0,6,8,8,2.5,4
STU083,0,2,2,2,0,2,2,0,2,2,4,4,4,4,4,4,4,4,4,0,4,8,8,3,4
STU084,2,2,0,2,0,2,2,2,2,2,4,4,4,0,4,4,4,0,0,0,6,8,8,5,5
STU085,2,2,2,2,2,0,2,2,0,2,4,4,4,4,4,4,4,4,4,4,6,8,8,4,5
STU086,2,2,2,2,2,2,2,2,2,2,4,4,4,4,0,0,4,4,0,0,6,5,8,3,5
STU087,0,2,2,2,2,2,2,0,0,0,4,4,4,4,4,4,0,4,4,4,3.5,8,8,8,4
STU088,2,2,2,2,2,2,2,2,2,2,4,4,0,4,4,4,4,4,4,4,6,8,8,8,5
STU089,2,0,2,2,2,2,2,0,2,0,0,4,4,4,4,4,4,0,4,0,6,5,4,4,4
STU090,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,0,4,4,0,4,6,8,5.5,8,5
STU091,0,2,0,0,0,0,0,0,2,0,0,4,0,0,4,0,4,0,0,0,3,8,4,4,4
STU092,2,2,2,2,2,0,2,0,2,2,4,0,4,0,4,4,4,4,0,0,4,4,3,4,4
STU093,2,2,0,2,2,2,0,2,2,0,4,4,4,4,4,0,0,0,4,0,3.5,5,4,8,5
STU094,2,0,2,2,2,2,2,2,2,2,4,4,4,0,0,4,4,4,0,4,6,5,8,5,4
STU095,2,2,2,0,2,0,2,2,2,0,4,0,0,0,4,0,0,4,0,0,6,3,4,4,4
STU096,2,2,2,0,2,2,2,2,2,2,4,4,4,0,4,4,0,0,4,0,3,4,4,4,3
STU097,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,4,4,8,8,8,6
STU098,0,2,2,2,2,2,2,0,2,0,4,4,0,0,4,0,0,0,0,0,3,4,8,3,4
STU099,2,2,2,2,2,2,2,2,2,2,4,4,0,4,4,4,4,4,0,4,6,8,8,5,4
STU100,0,0,0,2,2,0,2,2,0,0,0,4,4,0,0,4,0,0,0,0,2.5,3,3,3,4
STU101,2,2,2,2,2,2,2,2,2,2,4,4,0,4,4,0,4,4,4,4,5,8,8,8,4
STU102,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,0,0,4,6,8,5,5,6
STU103,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,0,6,8,8,8,5
STU104,2,2,2,2,2,2,2,2,2,2,0,4,4,4,4,0,4,0,0,0,3,3,4,3,5
STU105,0,2,2,2,2,0,0,2,0,2,0,0,0,0,0,0,0,4,0,0,3,8,8,3,4
STU106,2,0,2,0,2,0,2,2,0,0,0,0,4,0,4,4,0,4,4,4,3.5,4,4,3,5
STU107,2,2,2,0,2,2,0,0,2,2,0,0,4,0,4,0,4,4,0,0,6,4,8,4,5
STU108,0,0,2,2,2,2,2,2,2,2,4,4,4,0,4,4,0,4,0,4,6,8,8,8,6
STU109,2,2,0,0,2,2,2,2,2,2,4,4,4,4,0,4,4,4,4,4,6,4,8,8,4
STU110,2,2,0,2,2,2,0,0,2,2,0,0,0,4,0,0,4,0,0,0,3,8,4,3,4
STU111,2,2,2,2,2,2,2,2,2,2,4,0,0,4,4,4,4,4,0,4,6,8,5,5,6
STU112,2,2,2,2,2,0,2,2,2,2,4,4,0,4,4,4,0,4,4,0,6,8,4,8,4
STU113,2,2,2,2,2,2,2,2,0,2,4,4,4,4,0,4,4,0,0,4,6,5.5,5,8,10
STU114,2,2,2,0,2,2,2,0,2,2,4,0,4,4,4,4,0,4,0,0,3,8,5,8,10
STU115,2,2,2,2,0,2,0,2,2,2,4,0,0,0,0,4,4,4,4,4,6,8,8,4,5
STU116,2,2,0,0,2,0,0,0,0,2,0,4,0,0,0,4,4,0,0,4,6,4,3,3,4
STU117,2,2,2,2,2,0,2,2,0,2,0,0,0,0,4,4,0,0,4,0,6,8,4,3,4
STU118,2,2,2,2,2,2,2,2,0,2,4,4,0,4,4,0,4,0,4,0,6,4,8,4,5
STU119,2,2,0,0,0,0,2,0,2,2,4,0,4,0,0,0,0,0,4,0,6,3,4,4,4
STU120,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,0,4,8,8,8,6
STU121,2,2,0,2,2,2,0,2,2,2,4,4,4,4,4,0,0,4,4,4,6,5,8,3,10
STU122,2,0,2,2,2,2,2,2,2,2,4,4,4,0,4,0,0,0,4,0,6,5,8,4,4
STU123,2,0,2,2,0,2,2,2,2,2,4,4,4,0,4,4,4,0,4,0,6,5.5,5,5,4
STU124,2,2,2,2,0,0,2,2,2,2,4,0,4,4,0,4,0,4,0,0,3,5,4,4,5
STU125,2,2,2,2,2,2,2,0,2,2,4,4,4,0,4,4,0,0,4,0,6,8,8,8,5
STU126,2,0,2,2,0,0,2,0,2,2,0,0,0,0,4,0,0,0,0,0,3.5,3,4,3,
STU127,2,2,2,2,2,2,2,2,2,2,4,4,4,0,4,4,4,4,4,4,6,5,8,4,10
STU128,2,2,2,2,2,0,0,2,2,2,0,4,0,4,0,0,0,0,4,0,3,3,4,3,5
STU129,0,2,0,0,0,0,0,0,0,2,0,0,0,0,0,4,4,4,0,4,2.5,4,4,3,3
STU130,2,2,2,2,2,0,0,0,0,0,0,4,4,0,4,0,0,4,0,0,3.5,3,4,3,4
STU131,2,0,2,2,0,2,2,0,2,0,4,4,0,0,4,4,4,4,4,4,6,8,5,4,4
STU132,2,0,2,0,2,2,2,0,0,2,4,4,0,4,4,4,0,0,4,0,6,8,4,4,5
STU133,2,2,2,0,2,2,2,2,2,2,0,4,4,4,4,4,4,4,0,0,6,8,8,8,6
STU134,0,0,0,2,2,0,2,2,2,2,0,0,0,4,4,0,4,0,4,0,6,8,4,3,6
STU135,2,2,2,2,0,2,2,0,2,2,4,4,4,4,4,4,4,4,0,4,6,8,8,5,10
STU136,0,2,2,2,0,2,2,2,0,2,4,4,4,4,4,4,0,0,0,4,6,8,4,4,6
STU137,2,0,2,0,2,2,2,2,2,2,4,0,0,4,0,4,0,0,0,0,6,3,4,3,
STU138,0,2,0,2,2,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,6,4,8,4,
STU139,0,2,0,2,0,0,0,2,2,0,4,0,0,0,4,4,4,0,0,4,2.5,8,4,3,5
STU140,2,2,2,2,2,2,2,2,0,2,4,4,4,4,0,4,4,4,4,0,6,8,8,4,6
STU141,2,2,0,2,2,2,2,2,2,2,4,0,0,4,0,4,4,4,4,0,6,8,4,4,6
STU142,2,0,2,2,2,2,0,2,2,0,0,0,0,4,0,4,4,4,0,4,3,4,3,8,4
STU143,2,2,0,2,0,0,2,2,0,0,4,4,0,4,0,4,0,0,0,4,2.5,8,4,3,5
STU144,0,2,2,2,2,2,2,0,2,2,0,4,4,0,0,4,4,0,0,0,2.5,8,3,4,4
STU145,2,2,2,2,2,2,2,2,2,2,4,4,0,4,0,0,4,4,4,0,4,4,5,8,5
STU146,2,2,2,2,2,2,2,0,2,0,4,4,4,0,0,4,4,0,0,0,3.5,3,3,4,10
STU147,2,0,2,2,2,2,2,2,2,2,0,0,0,4,4,0,4,4,4,4,6,5,8,4,4
STU148,0,2,2,0,0,2,0,0,0,2,0,4,4,4,4,4,0,4,0,0,6,8,8,5,5
STU149,0,0,0,0,0,2,2,2,2,0,0,0,4,0,0,0,0,4,0,0,6,4,2.5,3,
STU150,2,2,2,2,2,2,2,2,2,2,4,4,0,4,4,4,4,4,4,4,6,8,8,8,6
STU151,2,2,2,0,2,2,2,2,2,2,4,4,0,4,4,4,4,4,0,4,6,4,5,3,5
STU152,2,2,2,2,0,2,2,2,2,2,4,4,0,4,0,0,4,4,0,4,6,5,4,3,5
STU153,2,2,2,2,2,2,2,2,2,2,4,4,0,4,4,0,4,4,4,0,6,8,5.5,8,5
STU154,2,0,0,0,0,0,0,2,2,2,0,0,0,0,4,0,0,0,0,0,2.5,4,8,8,3
STU155,2,2,2,2,2,2,2,0,0,0,4,4,4,4,4,0,0,0,0,0,6,8,4,4,5
STU156,2,2,2,2,2,0,2,2,2,2,4,0,4,4,0,4,4,4,4,4,3.5,8,8,8,10
STU157,2,2,2,0,2,2,0,0,0,0,4,4,0,4,0,4,0,4,4,4,2.5,3,4,3,5
STU158,2,2,2,2,0,2,0,0,2,0,4,0,4,4,0,0,4,0,4,0,4,3,8,4,5
STU159,2,2,0,2,2,0,2,2,0,2,0,0,0,4,4,4,4,0,4,0,3,5,4,8,4
STU160,2,2,2,0,0,2,0,0,2,2,4,0,4,4,4,0,4,4,0,0,3.5,8,8,3,10
STU161,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,4,4,8,8,8,10
STU162,2,2,0,2,2,2,0,2,0,0,0,4,0,4,4,4,4,0,0,0,6,4,4,4,3
STU163,2,2,2,2,2,2,2,2,2,0,4,4,4,4,4,0,4,0,4,0,6,8,4,5,6
STU164,2,2,2,2,2,0,2,2,0,2,4,0,0,4,0,0,4,4,4,4,6,4,4,3,5
STU165,0,0,0,2,0,0,2,2,2,2,4,4,0,4,0,0,0,0,4,4,6,8,5,4,4
STU166,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,4,6,8,8,8,6
STU167,2,2,2,2,2,0,2,0,2,2,4,4,4,0,4,0,4,4,0,0,3.5,5,8,4,4
STU168,2,2,2,0,0,2,0,2,0,2,0,0,0,0,0,4,0,4,4,0,3,4,8,3,
STU169,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,0,4,4,0,6,8,5,5,5
STU170,0,2,0,2,0,0,2,0,0,2,4,0,0,0,0,4,4,0,0,0,3.5,4,3,3,5
STU171,2,2,2,2,2,2,0,0,0,0,4,0,4,4,4,0,0,4,0,0,3.5,4,5,4,4
STU172,2,2,2,2,2,2,2,0,2,0,4,0,4,0,0,4,0,0,4,4,3.5,8,4,3,3
STU173,2,0,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,0,4,0,3.5,5,5,5,5
STU174,2,2,0,2,0,2,2,2,2,2,0,4,0,0,0,4,4,4,0,0,3.5,5.5,8,5,5
STU175,2,2,2,0,2,0,0,0,0,0,4,0,4,4,4,0,4,0,0,0,3.5,4,8,3,3
STU176,0,2,2,2,0,2,2,0,0,2,4,0,4,0,4,0,0,0,0,0,6,4,4,4,4
STU177,2,0,2,2,0,0,2,0,2,0,0,0,4,0,4,0,4,0,0,0,3.5,8,4,3,4
STU178,2,2,2,0,2,2,2,0,0,2,0,0,0,0,4,0,4,0,4,0,2.5,4,8,4,
STU179,0,0,2,2,2,2,0,0,0,0,4,0,4,0,4,4,0,0,0,0,3.5,8,8,3,5
STU180,2,2,2,2,0,0,0,2,0,0,4,4,0,0,0,0,0,4,0,0,3.5,3,4,3,4
STU181,2,2,2,2,2,2,0,2,0,0,4,4,4,4,4,0,0,0,0,4,4,8,4,4,4
STU182,2,2,2,2,2,2,2,2,2,2,0,4,4,4,4,4,4,0,4,0,3.5,5.5,5,4,5
STU183,2,0,2,2,2,2,2,0,0,2,4,0,4,4,4,4,4,4,4,4,6,5,4,4,5
STU184,2,2,2,0,2,2,0,2,2,2,4,4,4,4,4,4,4,4,4,4,6,8,8,8,10
STU185,2,2,2,2,0,2,2,2,2,2,0,4,4,4,4,4,4,0,4,0,6,8,5.5,5,10
STU186,2,2,0,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,4,6,8,8,8,6
STU187,2,2,2,2,2,0,2,0,0,2,4,0,4,4,4,4,4,4,4,4,6,4,4,4,5
STU188,2,2,0,2,2,0,2,0,0,2,0,4,0,0,4,4,0,4,0,0,6,5,4,4,4
STU189,0,2,2,0,0,2,0,0,0,2,4,4,0,0,4,4,0,0,4,4,6,4,3,3,5
STU190,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,0,4,4,4,4,6,8,8,8,5
STU191,2,2,2,2,2,2,2,0,0,2,4,0,4,0,4,4,0,4,0,4,6,8,8,4,3
STU192,2,0,2,2,2,2,2,2,0,2,4,4,4,4,4,0,4,4,4,0,6,5.5,5,8,4
STU193,2,2,0,2,2,2,2,2,2,2,4,4,4,0,4,4,0,0,4,4,6,5,8,3,5
STU194,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,0,6,8,8,8,10
STU195,2,2,2,2,0,0,2,2,2,2,4,4,0,0,4,4,0,4,4,0,6,8,5,5,10
STU196,0,2,2,2,0,2,0,0,0,0,0,4,0,0,0,4,4,4,4,4,6,8,3,4,3
STU197,2,0,0,2,0,2,2,2,2,2,0,0,0,4,4,4,4,0,4,0,3,4,8,4,5
STU198,2,2,2,2,0,2,0,2,2,2,4,0,4,4,4,4,4,4,0,4,6,5.5,8,8,4
STU199,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,4,6,8,8,5,6
STU200,2,2,2,2,2,0,2,2,2,2,4,4,4,4,4,4,4,4,4,0,6,8,8,5.5,7
STU201,2,0,2,2,2,0,2,2,0,0,0,0,4,0,0,0,0,4,4,0,3.5,4,3,3,
STU202,0,2,0,2,2,0,2,0,2,2,4,0,4,0,4,4,0,4,4,0,3,4,3,4,5
STU203,2,2,2,2,2,2,2,2,2,2,4,4,0,4,4,4,0,4,4,4,6,5.5,5.5,4,10
STU204,2,2,2,2,0,0,2,0,2,2,4,4,0,4,0,4,4,0,0,4,6,8,8,4,4
STU205,2,0,0,0,0,2,0,2,0,0,4,0,0,4,0,4,4,4,4,0,3,4,4,3,4
STU206,2,2,2,2,2,2,2,0,2,0,4,0,4,4,0,0,4,0,0,4,4,8,5,4,6
STU207,2,2,2,2,2,2,2,0,0,2,4,4,4,4,4,4,0,4,4,4,4,8,8,8,10
STU208,2,2,2,0,2,0,2,2,2,2,4,0,4,4,4,4,0,0,4,4,6,5,5,3,10
STU209,2,2,2,0,2,0,2,0,0,2,4,0,0,4,4,4,4,0,0,4,3.5,8,3,4,5
STU210,2,2,2,2,2,2,2,2,0,2,0,4,0,4,4,4,0,4,4,4,6,8,8,4,4
STU211,2,2,2,0,0,0,2,0,2,0,4,0,0,4,4,4,0,0,4,0,6,8,3,4,4
STU212,2,0,0,0,2,0,2,2,2,2,0,4,4,4,4,0,0,0,0,0,3.5,3,8,4,5
STU213,2,2,0,2,2,2,2,2,2,2,4,4,4,0,4,4,4,0,4,0,6,8,5,8,4
STU214,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,0,0,0,0,3,5,8,5,4
STU215,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,0,4,0,6,4,8,4,5
STU216,2,0,2,2,2,0,0,2,2,2,4,4,4,4,4,4,0,4,4,0,6,5,8,4,5
STU217,2,2,2,2,2,2,2,2,2,2,4,0,4,0,4,0,4,4,4,4,6,8,5,3,4
STU218,2,2,0,2,2,2,0,0,0,2,4,0,0,4,0,0,4,4,4,0,6,8,4,3,10
STU219,2,0,2,2,2,2,2,2,2,0,4,0,0,0,4,4,0,0,0,4,3,4,8,4,4
STU220,2,2,2,2,2,2,0,0,2,0,4,0,4,4,0,0,4,4,4,0,6,8,8,5,4
STU221,2,2,2,2,2,2,2,0,2,2,4,4,4,4,0,4,4,4,4,4,6,8,8,8,10
STU222,2,2,2,0,0,0,2,2,2,2,4,4,0,0,4,0,0,4,0,0,6,5,3,8,3
STU223,2,2,0,2,2,2,2,2,2,0,4,0,0,0,0,4,4,4,4,4,4,5,4,3,5
STU224,2,2,2,0,2,2,2,2,2,2,4,4,4,4,4,4,0,4,0,4,6,5,8,5,4
STU225,2,2,2,2,2,2,2,0,2,2,4,4,4,0,4,4,0,4,4,0,3.5,4,4,5,5
STU226,2,0,2,2,2,2,0,0,2,2,4,4,4,4,0,4,4,0,4,0,3.5,8,5,4,4
STU227,2,2,2,2,2,2,2,2,2,2,4,4,0,0,0,4,4,0,4,0,3,4,3,8,5
STU228,2,2,2,2,2,2,2,0,2,2,4,4,4,4,4,4,4,0,4,0,6,5,8,8,10
STU229,2,2,0,2,2,0,2,0,2,0,0,4,4,4,4,4,0,4,0,0,3,8,3,3,4
STU230,2,2,2,2,2,2,0,2,2,2,4,4,4,4,4,4,4,0,4,4,6,8,5,8,4
STU231,2,2,2,2,2,2,2,2,2,2,4,4,4,0,4,4,4,4,4,4,4,8,8,5,10
STU232,0,0,2,2,2,0,0,2,0,0,4,0,0,4,4,0,0,0,4,0,6,8,3,3,4
STU233,0,2,2,2,2,0,2,2,2,2,4,4,0,0,4,4,4,4,4,4,6,5.5,5,3,5
STU234,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,0,4,0,6,8,8,8,6
STU235,2,2,2,2,2,0,2,2,0,2,4,4,4,4,4,4,4,4,0,4,6,5,8,8,6
STU236,2,2,0,2,2,2,2,2,2,0,4,0,4,4,0,4,0,4,4,0,3.5,8,4,3,3
STU237,2,0,2,2,2,2,2,2,2,2,4,4,4,4,4,4,0,4,0,0,6,4,8,5,4
STU238,2,2,2,2,2,0,2,2,2,2,0,0,0,4,4,4,4,4,4,0,3,8,4,4,4
STU239,2,2,2,2,2,2,2,2,2,2,4,0,0,4,0,4,0,0,4,4,6,8,8,8,10
STU240,0,2,0,0,2,2,2,0,2,0,4,0,0,0,4,0,0,4,0,0,3,4,3,3,4
STU241,2,0,0,0,0,2,0,2,2,0,4,4,4,0,4,0,0,0,0,0,3,4,3,4,4
STU242,2,2,2,2,2,2,2,2,0,2,0,4,0,4,4,4,4,0,4,4,3,5,4,4,4
STU243,2,2,2,0,2,2,2,2,2,2,0,4,4,0,4,0,4,4,4,0,3,4,5,3,3
STU244,2,2,2,2,0,0,0,0,2,2,4,0,0,0,0,0,0,4,0,0,6,3,8,3,4
STU245,2,2,2,2,0,2,2,0,0,0,4,0,0,0,4,0,0,0,0,4,3,8,3,3,5
STU246,2,2,2,0,2,0,0,2,2,2,0,4,4,4,4,0,0,0,4,4,6,8,8,4,10
STU247,2,2,2,0,2,2,2,2,2,2,0,4,0,4,4,0,4,4,4,0,3.5,4,8,3,5
STU248,2,2,2,2,0,0,0,2,0,0,0,4,0,4,4,0,0,0,0,0,2.5,4,3,4,5
STU249,2,2,2,2,2,2,0,2,2,0,4,4,0,4,0,4,4,4,4,4,6,8,8,8,4
STU250,2,2,2,2,2,2,2,0,2,0,4,4,0,4,0,0,4,0,0,0,3,3,3,2.5,5
STU251,2,2,2,2,2,0,2,2,2,0,4,4,0,4,0,4,4,0,0,0,6,8,8,8,5
STU252,2,2,0,0,2,0,2,2,0,2,4,4,4,4,0,4,4,0,0,0,3.5,5.5,8,5,4
STU253,2,2,0,0,2,2,2,2,0,2,4,4,0,4,4,0,4,0,0,0,3.5,4,5,3,10
STU254,2,2,2,2,2,0,2,0,0,2,0,0,0,4,0,0,0,0,0,0,3,5,4,4,4
STU255,2,2,2,2,2,2,2,0,2,2,4,0,4,0,4,0,0,0,0,0,6,4,3,3,4
STU256,2,0,2,0,2,2,2,2,2,2,4,0,4,4,0,4,4,4,4,4,6,5,8,8,5
STU257,2,2,2,2,2,2,2,0,2,2,4,4,4,4,4,4,4,4,4,0,6,8,8,4,5
STU258,2,2,2,0,0,2,0,0,2,0,4,4,0,4,0,4,0,4,4,0,3,8,4,3,3
STU259,2,0,2,2,0,0,2,2,0,2,4,4,0,0,4,0,4,0,0,4,6,8,8,4,5
STU260,2,2,2,2,2,2,0,2,0,2,0,4,4,4,0,4,4,4,4,0,3.5,5,8,5,5
STU261,2,2,2,2,2,0,2,2,2,2,4,0,4,0,0,4,0,4,4,0,6,4,4,4,5
STU262,2,2,2,2,2,2,2,2,2,2,4,4,4,0,4,4,4,4,4,4,6,8,5,5,5
STU263,0,2,0,0,0,2,0,2,2,0,0,4,0,0,4,4,0,0,4,4,2.5,4,8,3,3
STU264,2,2,2,2,2,0,0,0,2,2,4,0,4,4,4,4,4,0,0,4,6,5,8,3,5
STU265,2,0,2,2,0,0,0,0,0,2,4,0,0,0,0,0,0,0,0,0,2.5,4,4,3,5
STU266,0,2,2,2,0,0,0,2,2,0,4,4,4,4,4,4,0,0,0,0,6,4,8,3,4
STU267,2,2,0,0,0,0,0,2,2,2,0,4,0,0,0,4,0,0,0,0,2.5,4,4,4,
STU268,0,2,2,0,2,2,0,2,2,2,4,4,0,0,0,0,0,0,0,4,6,4,8,3,4
STU269,2,2,2,2,0,0,2,2,2,0,0,4,4,0,0,0,4,0,4,0,6,8,4,8,10
STU270,2,2,2,2,2,2,2,2,2,0,4,4,4,0,4,4,4,4,0,4,6,5,8,8,6
STU271,2,2,2,2,2,0,0,2,2,0,0,0,4,0,4,0,4,0,0,4,3.5,4,5,8,5
STU272,2,2,2,2,2,2,0,2,2,2,4,4,4,0,4,4,0,4,0,4,6,8,8,8,6
STU273,2,0,2,2,2,2,2,2,2,2,4,0,4,4,4,4,4,4,4,0,6,8,8,5.5,5
STU274,0,0,2,2,2,2,2,0,2,2,4,4,0,0,4,4,0,0,4,4,6,8,3,3,5
STU275,0,2,2,0,2,2,2,2,2,0,4,4,4,4,4,0,4,0,0,4,4,5,8,4,10
STU276,2,2,2,2,2,0,2,2,0,0,0,4,4,0,4,4,4,4,0,0,6,4,5,5,10
STU277,2,2,2,0,0,0,2,2,2,2,0,0,0,0,4,0,4,0,4,0,2.5,4,3,3,
STU278,2,2,2,2,2,2,2,2,2,0,4,4,4,0,0,4,4,4,4,0,6,4,8,4,4
STU279,0,2,0,2,2,2,2,0,0,0,4,0,4,0,0,0,0,0,4,0,3,3,4,,4
STU280,2,0,2,2,0,2,2,0,0,0,4,4,4,0,4,0,0,4,0,0,2.5,4,4,3,4
STU281,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,0,4,3.5,8,8,5.5,5
STU282,2,2,2,2,2,2,2,2,2,2,4,4,0,4,4,0,4,4,0,4,6,8,8,8,6
STU283,2,2,2,0,2,2,2,2,2,2,0,0,4,4,4,0,4,0,0,0,6,8,8,4,10
STU284,0,0,0,2,0,0,2,0,2,2,0,4,4,0,0,0,0,0,0,0,2.5,3,3,4,3
STU285,2,0,2,2,0,0,2,2,2,2,4,0,0,4,4,4,4,0,4,4,4,8,8,8,4
STU286,2,2,2,0,2,0,2,0,2,2,0,4,4,4,4,4,4,4,0,0,6,8,5.5,8,5
STU287,0,0,2,0,0,0,2,0,2,2,4,4,0,0,4,0,0,0,0,0,6,8,8,3,4
STU288,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,4,6,5,5,8,4
STU289,2,2,0,2,2,0,0,2,2,2,0,4,0,4,4,4,0,0,4,0,6,8,5,5,10
STU290,2,2,2,0,2,2,2,0,0,2,4,4,4,0,4,4,4,4,0,0,6,5.5,8,4,10
STU291,2,2,2,0,2,2,2,0,2,0,0,4,4,4,4,0,4,4,0,4,6,5,8,3,5
STU292,2,2,2,0,2,2,2,2,2,2,0,4,4,4,0,4,4,4,4,0,6,8,8,8,6
STU293,2,2,2,2,2,0,2,2,0,2,4,4,4,4,4,4,0,4,0,4,6,8,8,5,10
STU294,2,2,2,0,2,2,0,2,2,2,4,0,4,4,4,4,4,4,4,0,3,4,4,4,5
STU295,2,2,2,0,0,2,0,0,2,0,4,4,4,4,4,4,0,0,0,0,3,4,8,3,5
STU296,2,2,2,2,2,2,0,2,0,2,4,4,4,0,4,0,0,4,0,4,6,8,8,5,4
STU297,2,0,2,2,2,2,2,2,2,2,4,4,0,4,4,0,4,0,4,4,6,8,8,8,10
STU298,2,2,0,0,2,2,2,0,0,2,4,0,0,4,4,0,0,0,0,0,3.5,4,5,4,5
STU299,2,2,2,2,0,0,0,2,2,0,4,4,4,0,4,4,0,4,0,0,6,8,5,4,5
STU300,2,2,2,2,2,2,2,2,2,2,0,4,4,4,4,4,4,0,4,4,6,5,4,3,10`
