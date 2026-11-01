// Static catalogue: temples, time slots, crowd levels, locker sizes, known festival days.
// Locker capacities and popularity scores are placeholder values; replace with real figures.
/* ---------- data ---------- */
const T=(id,n,c,s,d,p,w,cap)=>({id,n,c,s,d,p,w,cap});
const TEMPLES=[
T('tirumala','Sri Venkateswara Temple','Tirumala, Tirupati','Andhra Pradesh','Venkateswara',10,[6],800),
T('srisailam','Mallikarjuna Swamy Temple','Srisailam','Andhra Pradesh','Shiva',7,[1],300),
T('malinithan','Malinithan Temple','Likabali','Arunachal Pradesh','Durga',2,[],40),
T('kamakhya','Kamakhya Temple','Guwahati','Assam','Kamakhya Devi',8,[],400),
T('vishnupad','Vishnupad Temple','Gaya','Bihar','Vishnu',6,[],200),
T('bamleshwari','Bamleshwari Temple','Dongargarh','Chhattisgarh','Bamleshwari Devi',5,[2],150),
T('delhi-akshardham','Swaminarayan Akshardham','New Delhi','Delhi','Swaminarayan',8,[],500),
T('mangueshi','Shri Mangueshi Temple','Ponda','Goa','Shiva',5,[1],120),
T('somnath','Somnath Temple','Somnath','Gujarat','Shiva',9,[1],500),
T('dwarkadhish','Dwarkadhish Temple','Dwarka','Gujarat','Krishna',8,[],350),
T('mansa-panchkula','Mata Mansa Devi Mandir','Panchkula','Haryana','Mansa Devi',6,[2],200),
T('jwalaji','Jwala Ji Temple','Jwalamukhi','Himachal Pradesh','Jwala Devi',6,[2],160),
T('vaishno','Mata Vaishno Devi Shrine','Katra','Jammu and Kashmir','Vaishno Devi',10,[],700),
T('baidyanath','Baidyanath Dham','Deoghar','Jharkhand','Shiva',8,[1],350),
T('udupi','Sri Krishna Matha','Udupi','Karnataka','Krishna',8,[],350),
T('dharmasthala','Manjunatha Swamy Temple','Dharmasthala','Karnataka','Shiva',8,[1],400),
T('sabarimala','Sabarimala Sree Dharma Sastha Temple','Sabarimala, Pathanamthitta','Kerala','Ayyappa',10,[6],700),
T('padmanabha','Sree Padmanabhaswamy Temple','Thiruvananthapuram','Kerala','Vishnu',7,[],250),
T('mahakal','Mahakaleshwar Temple','Ujjain','Madhya Pradesh','Shiva',10,[1],700),
T('siddhivinayak','Siddhivinayak Temple','Prabhadevi, Mumbai','Maharashtra','Ganesha',9,[2],450),
T('shirdi','Shri Saibaba Sansthan','Shirdi','Maharashtra','Sai Baba',10,[4],700),
T('govindajee','Shri Govindajee Temple','Imphal','Manipur','Krishna',3,[],60),
T('nartiang','Nartiang Durga Temple','Nartiang','Meghalaya','Durga',2,[],40),
T('jagannath','Shri Jagannath Temple','Puri','Odisha','Jagannath',9,[],500),
T('manakula','Manakula Vinayagar Temple','Puducherry','Puducherry','Ganesha',5,[2],120),
T('durgiana','Durgiana Temple','Amritsar','Punjab','Durga',6,[2],220),
T('pushkar','Brahma Temple','Pushkar','Rajasthan','Brahma',6,[],200),
T('karnimata','Karni Mata Temple','Deshnok','Rajasthan','Karni Mata',5,[],150),
T('namchi','Siddheshwar Dham','Namchi','Sikkim','Shiva',4,[1],80),
T('meenakshi','Meenakshi Amman Temple','Madurai','Tamil Nadu','Meenakshi',9,[5],500),
T('rameswaram','Ramanathaswamy Temple','Rameswaram','Tamil Nadu','Shiva',8,[1],350),
T('yadagiri','Yadagirigutta Lakshmi Narasimha Temple','Yadagirigutta','Telangana','Narasimha',6,[6],220),
T('tripura-sundari','Tripura Sundari Temple','Udaipur','Tripura','Tripura Sundari',4,[],80),
T('kashi','Kashi Vishwanath Temple','Varanasi','Uttar Pradesh','Shiva',10,[1],700),
T('banke-bihari','Banke Bihari Temple','Vrindavan','Uttar Pradesh','Krishna',9,[],450),
T('ayodhya','Shri Ram Janmabhoomi Mandir','Ayodhya','Uttar Pradesh','Rama',10,[2],700),
T('mansa-haridwar','Mansa Devi Temple','Haridwar','Uttarakhand','Mansa Devi',7,[2],250),
T('dakshineswar','Dakshineswar Kali Temple','Kolkata','West Bengal','Kali',8,[6],350)
];
const BYID=Object.fromEntries(TEMPLES.map(t=>[t.id,t]));
const STATES=[...new Set(TEMPLES.map(t=>t.s))].sort();
const SLOTS=[
 {id:'s1',label:'5:00 – 7:00 AM',start:5,end:7,f:1.0,note:'Morning aarti'},
 {id:'s2',label:'7:00 – 9:00 AM',start:7,end:9,f:1.2,note:'Morning darshan'},
 {id:'s3',label:'9:00 – 11:00 AM',start:9,end:11,f:1.3,note:'Peak morning hours'},
 {id:'s4',label:'11:00 AM – 1:00 PM',start:11,end:13,f:1.05,note:'Midday'},
 {id:'s5',label:'4:00 – 6:00 PM',start:16,end:18,f:1.1,note:'Evening reopening'},
 {id:'s6',label:'6:00 – 8:00 PM',start:18,end:20,f:1.4,note:'Evening aarti'}
];
const LV=[{k:'low',t:'Low',L:'L',max:38,mix:20},{k:'mod',t:'Moderate',L:'M',max:58,mix:30},{k:'busy',t:'Busy',L:'B',max:82,mix:40},{k:'peak',t:'Peak',L:'P',max:9999,mix:55}];
const SIZES={S:{n:'Small',p:20,d:'Shoes, phone'},M:{n:'Medium',p:40,d:'Daypack, shoes'},L:{n:'Large',p:80,d:'Suitcase, bags'}};
const BUILTIN=[
 {date:'2026-11-08',name:'Diwali',boost:1.5,temple:'all'},
 {date:'2026-11-11',name:'Bhai Dooj',boost:1.2,temple:'all'},
 {date:'2026-11-15',name:'Chhath Puja',boost:1.3,temple:'vishnupad'},
 {date:'2026-11-23',name:'Vaikuntha Chaturdashi',boost:1.5,temple:'kashi'},
 {date:'2026-11-24',name:'Kartika Purnima',boost:1.4,temple:'all'},
 {from:'2026-11-17',to:'2027-01-20',name:'Mandala season',boost:1.6,temple:'sabarimala'}
];
const HORIZON=21;
const FIRST=['Ramesh','Sunita','Arjun','Lakshmi','Imran','Priya','Gurpreet','Anil','Meena','Suresh','Kavya','Rohit','Deepa','Vikram','Anjali','Mohan'];


export {TEMPLES,BYID,STATES,SLOTS,LV,SIZES,BUILTIN,HORIZON,FIRST};
