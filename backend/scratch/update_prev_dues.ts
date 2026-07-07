import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const studentsData = [
  { name: 'NihaLika', contact: '9336008844', father: 'Sachin', address: 'Kaithi', class: 'LKG', preBal: 1400 },
  { name: 'Deepika', contact: '7318211276', father: 'Ram Kumar', address: 'Jaitikheda', class: 'LKG', preBal: 1250 },
  { name: 'Sanvi', contact: '9161857342', father: 'Sandeep', address: 'Balsinghkheda', class: 'LKG', preBal: 3500 },
  { name: 'Prabal Prajapati', contact: '9140252085', father: 'Manish', address: 'Bhagukheda', class: 'LKG', preBal: 1100 },
  { name: 'Shabya', contact: '8604355723', father: 'Vipin', address: 'Kashimkheda', class: 'LKG', preBal: 140 },
  { name: 'Shivansh', contact: '9616017792', father: 'Vinod', address: 'Bijnor', class: 'LKG', preBal: 1200 },
  { name: 'Akriti', contact: '8318873638', father: 'Rajdeep', address: 'Dhanvasand', class: 'LKG', preBal: 10900 },
  { name: 'Ayansh', contact: '6387005746', father: 'Ajeet', address: 'Saraiyan', class: 'LKG', preBal: 400 },
  { name: 'JIVANSH', contact: '9696547899', father: 'gurudeep', address: 'SAHAHZADPUR', class: 'LKG', preBal: 4600 },
  { name: 'SAUMYA', contact: '7881137104', father: 'dheeraj', address: 'Jaitikheda', class: 'LKG', preBal: 150 },
  { name: 'SANKALP', contact: '9936867292', father: 'ASHISH', address: 'RAIPUR', class: 'LKG', preBal: 2000 },
  { name: 'SANSKAR', contact: '6389482971', father: 'JAMUNA', address: 'TIKRA', class: 'LKG', preBal: 6060 },
  { name: 'LAKSHYA', contact: '6389482971', father: 'JAMUNA', address: 'TIKRA', class: 'LKG', preBal: 14360 },
  { name: 'SANAYA', contact: '9970122490', father: 'ARVIND', address: 'JABRELLA', class: 'LKG', preBal: 1100 },
  { name: 'SARTHAK SINGH', contact: '9005779039', father: 'VISHALENDER', address: 'Mansabkheda', class: 'LKG', preBal: 1870 },
  { name: 'VIRAT PAL', contact: '8127952349', father: 'HEMU', address: 'BHAUNDRI', class: 'LKG', preBal: 5900 },
  { name: 'ATHRAV', contact: '7703080944', father: 'UMESH', address: 'Bijnor', class: 'LKG', preBal: 300 },
  { name: 'Ananya', contact: '9219442285', father: 'Suraj', address: 'Sariyan', class: 'UKG', preBal: 4200 },
  { name: 'Abhika', contact: '9005049909', father: 'Chatur Singh', address: 'Gudwa', class: 'UKG', preBal: 6150 },
  { name: 'Ayush Yadav', contact: '8874872274', father: 'Shiv Charan', address: 'Raheem Nagar', class: 'UKG', preBal: 13300 },
  { name: 'Devika', contact: '9670892591', father: 'Rambabu', address: 'Majhigawa', class: 'UKG', preBal: 1200 },
  { name: 'Divyansh', contact: '9005664787', father: 'Sandeep Yadav', address: 'Dhanuasand', class: 'UKG', preBal: 7800 },
  { name: 'Gurman Singh', contact: '7236819865', father: 'Gurupreet Singh', address: 'Kaithi', class: 'UKG', preBal: 100 },
  { name: 'Manya Yadav', contact: '9793048384', father: 'Manoj Kumar', address: 'Kasim Khera', class: 'UKG', preBal: 6450 },
  { name: 'Niharika Yadav', contact: '7307447080', father: 'Mukesh', address: 'Ranikhera', class: 'UKG', preBal: 28600 },
  { name: 'Raji', contact: '7525003234', father: 'Juber Khan', address: 'Bhagukhera', class: 'UKG', preBal: 6000 },
  { name: 'Rishu Verma', contact: '7905124374', father: 'Sandeep Verma', address: 'Bhagukhera', class: 'UKG', preBal: 1200 },
  { name: 'ARUSH', contact: '9559416238', father: 'AJAY', address: 'DHANWASAND', class: 'UKG', preBal: 3700 },
  { name: 'Abhi Yadav', contact: '9695087914', father: 'Santosh Yadav', address: 'Rheem Nagar', class: 'UKG', preBal: 12200 },
  { name: 'Aditya Yadav', contact: '9793260659', father: 'Ram Mahesh', address: 'Rheem Nagar', class: 'UKG', preBal: 7000 },
  { name: 'Anuraj Yadav', contact: '7388176573', father: 'Radhey Shyam', address: 'DHANWASAND', class: 'UKG', preBal: 3800 },
  { name: 'Arvi', contact: '9621992361', father: 'Sarvan Kumar', address: 'Majhigava', class: 'UKG', preBal: 750 },
  { name: 'Atharva', contact: '8174967881', father: 'Ashish Kumar', address: 'Ranikhera', class: 'UKG', preBal: 20800 },
  { name: 'Aviral Pal', contact: '7522829477', father: 'Amardeep Pal', address: 'Jaitikhera', class: 'UKG', preBal: 3050 },
  { name: 'Kulvant Singh', contact: '9397258830', father: 'Bindra Prasad', address: 'Raheem Nagar', class: 'UKG', preBal: 9600 },
  { name: 'Payal Yadav', contact: '8174828035', father: 'Satish Yadav', address: 'Balsingkhera', class: 'UKG', preBal: 3500 },
  { name: 'Rivansh Verma', contact: '', father: 'Ritesh Verma', address: 'Bhagukhera', class: 'UKG', preBal: 25000 },
  { name: 'Vaibhav Chaurasiya', contact: '', father: 'Saroj Kumar', address: 'Dhanvasand', class: 'UKG', preBal: 15000 },
  { name: 'Kartik', contact: '', father: 'Ram Vilas', address: 'Raipur', class: 'UKG', preBal: 25450 },
  { name: 'Naveen', contact: '9198646265', father: 'Jitendra', address: 'Trilokpur', class: 'UKG', preBal: 22150 },
  { name: 'Manya', contact: '9198646265', father: 'Akhilesh', address: 'Trilokpur', class: 'UKG', preBal: 25450 },
  { name: 'NITYA', contact: '9125874265', father: 'NAGENDRA', address: 'NEEEWA', class: 'UKG', preBal: 12200 },
  { name: 'MD. SAIF', contact: '8601560380', father: 'SHAHANSHAH', address: 'Jaitikhera', class: 'UKG', preBal: 16450 },
  { name: 'SHRADDHA', contact: '9415145676', father: 'RAHUL', address: 'SHAHZADPUR', class: 'UKG', preBal: 1900 },
  { name: 'Abhi', contact: '8400060305', father: 'Umesh Kumar', address: 'Dhanuasand', class: 'CLASS 1', preBal: 800 },
  { name: 'VIVAN SAHU', contact: '', father: 'Alkesh Sahu', address: 'Sariyan', class: 'CLASS 1', preBal: 600 },
  { name: 'Aradhya', contact: '9005299324', father: 'Surendra Kumar', address: 'Bhagukhreda', class: 'CLASS 1', preBal: 6000 },
  { name: 'Arohi Raj', contact: '7390975777', father: 'Diwakar Nath', address: 'Majhigawa', class: 'CLASS 1', preBal: 3000 },
  { name: 'Aditi', contact: '9557205618', father: 'Atul Kumar', address: 'Meeranpur', class: 'CLASS 1', preBal: 100 },
  { name: 'Kartik Singh', contact: '9305050859', father: 'Anuj Pratap Singh', address: 'Dhanuasand', class: 'CLASS 1', preBal: 1080 },
  { name: 'Kashish Dhiman', contact: '9793112230', father: 'Rajesh Kumar Dhiman', address: 'Tikra', class: 'CLASS 1', preBal: 23100 },
  { name: 'Kaustuk Pal', contact: '9119656402', father: 'Dharam Prakash Pal', address: 'Tikra Sani', class: 'CLASS 1', preBal: 4400 },
  { name: 'Kavya Dhiman', contact: '9393112230', father: 'Rajesh Kumar Dhiman', address: 'Tikra Sani', class: 'CLASS 1', preBal: 25820 },
  { name: 'Muskan Gautam', contact: '7355457283', father: 'Rakesh Kumar', address: 'Mohinikheda', class: 'CLASS 1', preBal: 2900 },
  { name: 'Sarthak Yadav', contact: '6390147115', father: 'Sandeep Yadav', address: 'Balsingkhera', class: 'CLASS 1', preBal: 2700 },
  { name: 'Suryansh', contact: '6393687038', father: 'Ashok Kumar', address: 'Memaura', class: 'CLASS 1', preBal: 50 },
  { name: 'Manvi Gautam', contact: '', father: 'Jitendra', address: 'Mohinikheda', class: 'CLASS 1', preBal: 9100 },
  { name: 'ARPITA', contact: '6394627845', father: 'ANKIT', address: 'Kaithi', class: 'CLASS 1', preBal: 3300 },
  { name: 'KUMKUM', contact: '8090056385', father: 'SUNIL', address: 'MAJHIGAWA', class: 'CLASS 1', preBal: 1700 },
  { name: 'Ansh Yadav', contact: '9935839294', father: 'Mahendra', address: 'Nanki Khera', class: 'CLASS 1', preBal: 2050 },
  { name: 'Anvi', contact: '9198997093', father: 'Abhishek Kumar', address: 'Dhanuasand', class: 'CLASS 1', preBal: 9950 },
  { name: 'Aradhaya Yadav', contact: '9795184320', father: 'Awadhesh Yadav', address: 'Kamlapur', class: 'CLASS 1', preBal: 2600 },
  { name: 'Nihal Singh', contact: '', father: 'Mukesh Kumar', address: 'Ranikhera', class: 'CLASS 1', preBal: 30000 },
  { name: 'Palak Tiwari', contact: '7800391732', father: 'Anuj Kumar Tiwari', address: 'Raipur', class: 'CLASS 1', preBal: 2050 },
  { name: 'Sagar', contact: '7985821232', father: 'Rajendra', address: 'Saraiyan', class: 'CLASS 1', preBal: 950 },
  { name: 'Saurbha Kumar', contact: '9125231936', father: 'Saroj Kumar', address: 'Alaudi Kheda', class: 'CLASS 1', preBal: 3900 },
  { name: 'Shagun', contact: '8090535949', father: 'Pintu', address: 'Majhigawa', class: 'CLASS 1', preBal: 12860 },
  { name: 'Tasu Pal', contact: '7054997015', father: 'Mahendra Singh Pal', address: 'Bharswa', class: 'CLASS 1', preBal: 2000 },
  { name: 'Vihaan', contact: '8127952349', father: 'Hemu Pal', address: 'Bhoundari', class: 'CLASS 1', preBal: 9400 },
  { name: 'KARTIK', contact: '6386987003', father: 'DILEEP', address: 'MARUI', class: 'CLASS 1', preBal: 1900 },
  { name: 'Aarush Yadav', contact: '9221925834', father: 'Rakesh', address: 'Kasim Kheda', class: 'CLASS 2', preBal: 1250 },
  { name: 'Abhi Pal', contact: '8858744507', father: 'Awdhesh Pal', address: 'Tikra', class: 'CLASS 2', preBal: 3600 },
  { name: 'Aayan', contact: '9621402286', father: 'Nadeem', address: 'Chandrawal', class: 'CLASS 2', preBal: 4475 },
  { name: 'Anaya Singh', contact: '8090079038', father: 'Amit Singh', address: 'Kamla Pur', class: 'CLASS 2', preBal: 2400 },
  { name: 'Abhinav Yadav', contact: '7753861195', father: 'Jay Singh', address: 'Dhanuasand', class: 'CLASS 2', preBal: 9100 },
  { name: 'Anika', contact: '8400229125', father: 'Lallan', address: 'Dhanuasand', class: 'CLASS 2', preBal: 840 },
  { name: 'Anvi', contact: '9956319601', father: 'Raj Kumar', address: 'Laxman Khera', class: 'CLASS 2', preBal: 1050 },
  { name: 'Ayush', contact: '8950495586', father: 'Rakesh', address: 'Tikra', class: 'CLASS 2', preBal: 15320 },
  { name: 'Kavya Singh', contact: '9235128910', father: 'Pravesh Singh', address: 'Jaithi Kheda', class: 'CLASS 2', preBal: 8400 },
  { name: 'Nikhil', contact: '7905742290', father: 'Vimal Kumar', address: 'Kaithi', class: 'CLASS 2', preBal: 350 },
  { name: 'Pragya Yadav', contact: '9956772135', father: 'Bindra Prasad', address: 'Raheem Nagar', class: 'CLASS 2', preBal: 50 },
  { name: 'Shourya Singh', contact: '7054724713', father: 'Sujeet Singh', address: 'Dhanuasand', class: 'CLASS 2', preBal: 4380 },
  { name: 'Srishti Raj', contact: '9936867292', father: 'Ashish Kumar', address: 'Raipur', class: 'CLASS 2', preBal: 4600 },
  { name: 'Vansh Yadav', contact: '8115948748', father: 'Rajveer Yadav', address: 'Nurdikhera', class: 'CLASS 2', preBal: 16350 },
  { name: 'Yenjal Kumari', contact: '6206561488', father: 'Manoj', address: 'Bhagukheda', class: 'CLASS 2', preBal: 2150 },
  { name: 'Ansh Yadav', contact: '8174814251', father: 'Arvind', address: 'Bhadarsha', class: 'CLASS 2', preBal: 3650 },
  { name: 'SHIVANSH SHARMA', contact: '8303562429', father: 'Suneel Kumar', address: 'Sariyan', class: 'CLASS 2', preBal: 10650 },
  { name: 'SHRISTI', contact: '', father: 'JAMUNA', address: 'Tikra', class: 'CLASS 2', preBal: 1000 },
  { name: 'Abhay Sharma', contact: '9670967747', father: 'Mr. Shiv Lal', address: 'Raipur', class: 'CLASS 3', preBal: 1000 },
  { name: 'Abhijeet Singh', contact: '7071770770', father: 'Indrajeet Singh', address: 'Kamlapur', class: 'CLASS 3', preBal: 17700 },
  { name: 'AMOL DWIVWDI', contact: '9559858315', father: 'Ajay Dwivedi', address: 'Bhadesua', class: 'CLASS 3', preBal: 100 },
  { name: 'Anmol Yadav', contact: '9494073463', father: 'Satyaveer Yadav', address: 'Rani Kheda', class: 'CLASS 3', preBal: 1500 },
  { name: 'Ansh Tiwari', contact: '7355203494', father: 'Pradeep Tiwari', address: 'Jaiti Kheda', class: 'CLASS 3', preBal: 5200 },
  { name: 'Ansh Yadav', contact: '9005049909', father: 'Raghuvendra', address: 'Godwa', class: 'CLASS 3', preBal: 10800 },
  { name: 'Aradhya Yadav', contact: '9005049909', father: 'Chatur Singh', address: 'Godwa', class: 'CLASS 3', preBal: 8350 },
  { name: 'Krishna Gupta', contact: '8787016061', father: 'Sandeep Gupta', address: 'Bhadesua', class: 'CLASS 3', preBal: 900 },
  { name: 'Kulshreshat', contact: '9198996367', father: 'Mahendra Pratap Singh', address: 'Mansab Kheda', class: 'CLASS 3', preBal: 8010 },
  { name: 'Mayank', contact: '9198942267', father: 'Rakesh Gupta', address: 'Bhadesua', class: 'CLASS 3', preBal: 2000 },
  { name: 'Rishabh Sahu', contact: '8853446344', father: 'Kuldeep Sahu', address: 'Marui', class: 'CLASS 3', preBal: 2100 },
  { name: 'Tamanna', contact: '9559386721', father: 'Satyavan', address: 'Dhanusand', class: 'CLASS 3', preBal: 5300 },
  { name: 'Tanya', contact: '7991935026', father: 'Alok Kumar', address: 'Dhanusand', class: 'CLASS 3', preBal: 3550 },
  { name: 'Adarsh Sharma', contact: '8127060191', father: 'Uttam Kumar Sharma', address: 'Sariyan', class: 'CLASS 3', preBal: 600 },
  { name: 'Priyanka li', contact: '7235035108', father: 'Rajendra Kumar', address: 'Bhagukheda', class: 'CLASS 3', preBal: 500 },
  { name: 'ANMOL LODHI', contact: '8858924335', father: 'ASHISH', address: 'KAITHI', class: 'CLASS 3', preBal: 1500 },
  { name: 'PALLAVI', contact: '9559416238', father: 'AJAY', address: 'Dhanusand', class: 'CLASS 3', preBal: 50 },
  { name: 'Abhishek', contact: '8081337955', father: 'Manoj Kumar', address: 'Bhagukheda', class: 'CLASS 4', preBal: 750 },
  { name: 'Ayush Kumar', contact: '6239268844', father: 'Shiv Kailash', address: 'Memaura', class: 'CLASS 4', preBal: 200 },
  { name: 'Hardik Singh', contact: '9305050859', father: 'Anuj Pratap Singh', address: 'Dhanuasand', class: 'CLASS 4', preBal: 3940 },
  { name: 'Ishani', contact: '9935933441', father: 'Anil Kumar', address: 'Dhanuasand', class: 'CLASS 4', preBal: 2300 },
  { name: 'Janvi Yadav', contact: '9621808299', father: 'Lal Ji', address: 'Himmat Kheda', class: 'CLASS 4', preBal: 1300 },
  { name: 'Pallawi', contact: '8174828035', father: 'Satish Kumar', address: 'Balsingh Heda', class: 'CLASS 4', preBal: 2300 },
  { name: 'RADHIKA', contact: '9198087588', father: 'Dharmendra Singh', address: 'Rani Kheda', class: 'CLASS 4', preBal: 3150 },
  { name: 'Raj Yadav', contact: '7355729728', father: 'Birendra', address: 'Nurdi Kheda', class: 'CLASS 4', preBal: 2750 },
  { name: 'Utkarsh', contact: '8542936571', father: 'Vijay Kumar', address: 'Mansab Kheda', class: 'CLASS 4', preBal: 900 },
  { name: 'Vansh Singh', contact: '9118003127', father: 'Pravesh Kumar', address: 'Jaiti Kheda', class: 'CLASS 4', preBal: 2250 },
  { name: 'SURYANSH', contact: '6393372514', father: 'ASTRALIN', address: 'BHAUNDRI', class: 'CLASS 4', preBal: 1450 },
  { name: 'ARPITA', contact: '8127209246', father: 'KULDEEP', address: 'Rani Kheda', class: 'CLASS 4', preBal: 4250 },
  { name: 'SHIVAAY', contact: '7007322155', father: 'Sanjay', address: 'BALSINGHKHEDA', class: 'CLASS 4', preBal: 8400 },
  { name: 'Anchal', contact: '8127039092', father: 'Hari Prakash', address: 'Raipur', class: 'CLASS 5', preBal: 25050 },
  { name: 'Dishant', contact: '9963577806', father: 'Bindra Prasad', address: 'Tikra', class: 'CLASS 5', preBal: 20 },
  { name: 'Pranshu', contact: '9936004314', father: 'Baijnath Chaurasiya', address: 'Sisendi', class: 'CLASS 5', preBal: 4800 },
  { name: 'Rishab Yadav', contact: '9198996367', father: 'Mahendra Pratap Singh', address: 'Mansab Kheda', class: 'CLASS 5', preBal: 13370 },
  { name: 'Sanya Maurya', contact: '9453586083', father: 'Vinay Maurya', address: 'Chnadrawal', class: 'CLASS 5', preBal: 23400 },
  { name: 'Shivani', contact: '9793573501', father: 'Roshan Kumar Sharma', address: 'Bhadesua', class: 'CLASS 5', preBal: 2650 },
  { name: 'Shreya Tiwari', contact: '9450432343', father: 'Amit Tiwari', address: 'Raipur', class: 'CLASS 5', preBal: 2450 },
  { name: 'Vartika Yadav', contact: '8301960977', father: 'Umesh Chand', address: 'Iqbal Kheda', class: 'CLASS 5', preBal: 800 },
  { name: 'Gungun', contact: '7054629152', father: 'Suresh', address: 'Dhanvasand', class: 'CLASS 5', preBal: 1900 },
  { name: 'Aradhya Rawat', contact: '9621992361', father: 'Sarvan Kumar', address: 'Majhigava', class: 'CLASS 5', preBal: 600 },
  { name: 'Aradhya Sahu', contact: '8840421450', father: 'Alkesh Sahu', address: 'Sariyan', class: 'CLASS 5', preBal: 600 },
  { name: 'Uddyansh Kumar', contact: '7460892280', father: 'Surajpal Prajapati', address: 'Sariyan', class: 'CLASS 5', preBal: 2600 },
  { name: 'ANSHIKA VERMA', contact: '8400074003', father: 'PRAMOD', address: 'Bhagukhera', class: 'CLASS 5', preBal: 750 },
  { name: 'Adarsh Yadav', contact: '9793048384', father: 'Manoj Kumar', address: 'Kasim Kheda', class: 'CLASS 6', preBal: 900 },
  { name: 'Amrita Pal', contact: '8858744507', father: 'Awdhesh Pal', address: 'Tikra', class: 'CLASS 6', preBal: 11560 },
  { name: 'Ansh Sagar', contact: '9506836200', father: 'Sugreev', address: 'Natjur', class: 'CLASS 6', preBal: 2900 },
  { name: 'Ansh Yadav', contact: '8840906123', father: 'Dilip Kumar', address: 'Dhanuasand', class: 'CLASS 6', preBal: 2300 },
  { name: 'Kuwar Singh', contact: '8736933001', father: 'Ganga Sagar', address: 'Raheen Nagar', class: 'CLASS 6', preBal: 10150 },
  { name: 'Lavi', contact: '9798915464', father: 'Raghuvendra', address: 'Godwa', class: 'CLASS 6', preBal: 750 },
  { name: 'Manish Yadav', contact: '8528953963', father: 'Mukesh Yadav', address: 'Raheen Nagar', class: 'CLASS 6', preBal: 4600 },
  { name: 'Naman Rawat', contact: '7081929375', father: 'Ram Karan', address: 'Mullahi Kheda', class: 'CLASS 6', preBal: 2050 },
  { name: 'Parinita Chaudhri', contact: '9415860918', father: 'Rajesh Ku. Chaudhry', address: 'Bijnor', class: 'CLASS 6', preBal: 2300 },
  { name: 'Pranshi', contact: '8953941260', father: 'Baijnath Chaurasiya', address: 'Sisendi', class: 'CLASS 6', preBal: 5700 },
  { name: 'Shagun', contact: '9794008316', father: 'Omkarnath', address: 'Dhanuasand', class: 'CLASS 6', preBal: 2300 },
  { name: 'Shagun Sharma', contact: '8423147821', father: 'Sudeep', address: 'Bhaundri', class: 'CLASS 6', preBal: 2300 },
  { name: 'Vinay Kumar Yadav', contact: '91261524486', father: 'Awadh Ram', address: 'Saraiyan', class: 'CLASS 6', preBal: 1900 },
  { name: 'ANAND KUMAR', contact: '', father: 'SANJEET', address: 'BHAGU KHEDA', class: 'CLASS 6', preBal: 250 },
  { name: 'FUZAIL SIDDIQUI', contact: '', father: 'MOHD FAHEEM', address: 'BIJNOUR', class: 'CLASS 6', preBal: 5600 },
  { name: 'Anshi', contact: '9897158391', father: 'Ajay', address: 'Bhagukheda', class: 'CLASS 6', preBal: 750 },
  { name: 'Alina Khan', contact: '7318219234', father: 'Arshad Khan', address: 'Chandrawal', class: 'CLASS 7', preBal: 12400 },
  { name: 'Anika', contact: '9555887926', father: 'Narendra Kumar', address: 'Marui', class: 'CLASS 7', preBal: 1535 },
  { name: 'Aniket LODHI', contact: '8858924335', father: 'Ashish Yadav', address: 'Kaithi', class: 'CLASS 7', preBal: 1700 },
  { name: 'Arohi', contact: '9506836200', father: 'Sugreev', address: 'Natkur', class: 'CLASS 7', preBal: 2400 },
  { name: 'Divyansh Yadav', contact: '6388179373', father: 'Pradeep Kumar', address: 'Kaithi', class: 'CLASS 7', preBal: 200 },
  { name: 'Kapil Sharma', contact: '9005370849', father: 'Pawan Sharma', address: 'Bhadesua', class: 'CLASS 7', preBal: 750 },
  { name: 'Kaushik', contact: '7005474713', father: 'Sujeet', address: 'Dhanuasand', class: 'CLASS 7', preBal: 5550 },
  { name: 'Mahi Tiwari', contact: '7355651420', father: 'Dilip Tiwari', address: 'Jaithi Kheda', class: 'CLASS 7', preBal: 100 },
  { name: 'Md. Arshalan', contact: '9044820090', father: 'Md. Ikrar', address: 'Natkur', class: 'CLASS 7', preBal: 7300 },
  { name: 'Piyush Yadav', contact: '9125883466', father: 'Rajkumar Yadav', address: 'Nanki Kheda', class: 'CLASS 7', preBal: 2400 },
  { name: 'Prateek Rawat', contact: '7880329275', father: 'Rakesh Rawat', address: 'Tikra', class: 'CLASS 7', preBal: 3330 },
  { name: 'Preeti', contact: '9695518653', father: 'Anodh Kumar', address: 'Balsingh Kheda', class: 'CLASS 7', preBal: 2500 },
  { name: 'Shagun Gupta', contact: '8787016061', father: 'Sadeep Gupta', address: 'Bhadesua', class: 'CLASS 7', preBal: 900 },
  { name: 'Shivank', contact: '8400253105', father: 'Srikant', address: 'Shankar Kheda', class: 'CLASS 7', preBal: 4700 },
  { name: 'Tarun Rajpoot', contact: '6387410034', father: 'Anjani Kumar', address: 'Kaithi', class: 'CLASS 7', preBal: 1800 },
  { name: 'ARSHITA', contact: '8127809246', father: 'RANIKHEDA', address: 'MAJHIGAWA', class: 'CLASS 7', preBal: 1700 },
  { name: 'Abhay Yadav li', contact: '8840906123', father: 'Dilip Kumar', address: 'Dhanuasand', class: 'CLASS -8', preBal: 2500 },
  { name: 'Aham Yadav', contact: '9555615583', father: 'Sanjeet Kumar', address: 'Manohara Pur', class: 'CLASS -8', preBal: 3700 },
  { name: 'Akansha Pal', contact: '7355525587', father: 'Satendra Pal', address: 'Marui', class: 'CLASS -8', preBal: 1700 },
  { name: 'Anushka', contact: '6939687038', father: 'Ashok Kumar', address: 'Memaura', class: 'CLASS -8', preBal: 2000 },
  { name: 'Deepanshu', contact: '8400594309', father: 'Chandra Shekar', address: 'Marui', class: 'CLASS -8', preBal: 8500 },
  { name: 'Manvi Yadav', contact: '9793048384', father: 'Manoj Kumar', address: 'Kasim Kheda', class: 'CLASS -8', preBal: 900 },
  { name: 'Prince Yadav', contact: '8528953963', father: 'Mukesh Yadav', address: 'Raheen Nagar', class: 'CLASS -8', preBal: 2500 },
  { name: 'Raunak', contact: '9559662467', father: 'Late Raju Pal', address: 'Bhadarsha', class: 'CLASS -8', preBal: 5200 },
  { name: 'Rishabh Verma', contact: '7905512437', father: 'Sandeep Verma', address: 'Bhagukhera', class: 'CLASS -8', preBal: 1650 },
  { name: 'Sarthak', contact: '8318960977', father: 'Umesh Chandra', address: 'Iqbal Kheda', class: 'CLASS -8', preBal: 800 },
  { name: 'Satyam Yadav', contact: '9559386684', father: 'Shiv Karan', address: 'Trilok Pur', class: 'CLASS -8', preBal: 5300 },
  { name: 'TANISHK', contact: '6393372514', father: 'ASTRALIN', address: 'Bhagukhera', class: 'CLASS -8', preBal: 5400 },
  { name: 'Aarush', contact: '', father: 'Jitendra Pratap Singh', address: 'Mansab Kheda', class: 'CLASS -9', preBal: 2320 },
  { name: 'BHOOMIKA', contact: '', father: 'LAL BAHADUR', address: 'KAITHI', class: 'CLASS 9', preBal: 2800 },
  { name: 'ARPIT', contact: '', father: 'Santosh Yadav', address: 'Memaura', class: 'CLASS -9', preBal: 14550 },
  { name: 'Aryan Rawat', contact: '', father: 'Raj Kumar', address: 'Natkur', class: 'CLASS -9', preBal: 3400 },
  { name: 'ARYAN YADAV', contact: '', father: 'Rajneesh Kumar', address: 'Marui', class: 'CLASS -9', preBal: 10 },
  { name: 'Avi Sharma', contact: '', father: 'Ritesh Sharma', address: 'Jaithi Kheda', class: 'CLASS -9', preBal: 1100 },
  { name: 'Ayush Rawat', contact: '', father: 'Pawan Kumar', address: 'Majhigawa', class: 'CLASS -9', preBal: 1600 },
  { name: 'Mahek Yadav', contact: '', father: 'Suneel Kumar', address: 'Dhanuasand', class: 'CLASS -9', preBal: 5000 },
  { name: 'Mahi Yadav I', contact: '', father: 'Suneel Kumar', address: 'Dhanuasand', class: 'CLASS -9', preBal: 5000 },
  { name: 'Manvi Rajpoot', contact: '', father: 'Anjani Kumar', address: 'Kaihti', class: 'CLASS -9', preBal: 9100 },
  { name: 'Naitik Yadav', contact: '', father: 'Lalji', address: 'Himmat Kheda', class: 'CLASS -9', preBal: 1350 },
  { name: 'Rohit Yadav', contact: '', father: 'Shiv Kumar Yadav', address: 'Dhanuasand', class: 'CLASS -9', preBal: 2500 },
  { name: 'Ronak Rawat', contact: '', father: 'Ram Karan', address: 'Mullahi Kheda', class: 'CLASS -9', preBal: 2250 },
  { name: 'Tanya Yadav', contact: '', father: 'Anil Kumar', address: 'Mansab Kheda', class: 'CLASS -9', preBal: 5840 },
  { name: 'Virat Singh', contact: '', father: 'Deep Sinsh', address: 'Sariyan', class: 'CLASS -9', preBal: 24100 },
  { name: 'Chahak', contact: '', father: 'Vinod', address: 'Bijnor', class: 'CLASS -9', preBal: 800 },
  { name: 'HIMANSHU', contact: '', father: 'YUVRAJ', address: 'DHANWASAND', class: 'CLASS -9', preBal: 4300 }
];

async function updateDues() {
  let matchCount = 0;
  let updateCount = 0;
  let notFound = [];

  for (const item of studentsData) {
    // try to find by name and father's name (case-insensitive)
    const students = await prisma.studentProfile.findMany({
      where: {
        user: {
          name: {
            equals: item.name,
            mode: 'insensitive'
          }
        },
        fatherName: {
          equals: item.father,
          mode: 'insensitive'
        }
      },
      include: { user: true }
    });

    if (students.length === 1) {
      matchCount++;
      await prisma.studentProfile.update({
        where: { id: students[0].id },
        data: { previousSessionDue: item.preBal }
      });
      updateCount++;
    } else if (students.length === 0) {
      // try to find by contact
      if (item.contact) {
        const studentsByContact = await prisma.studentProfile.findMany({
          where: {
            user: {
              name: {
                equals: item.name,
                mode: 'insensitive'
              }
            },
            fatherMobile: item.contact
          },
          include: { user: true }
        });

        if (studentsByContact.length === 1) {
          matchCount++;
          await prisma.studentProfile.update({
            where: { id: studentsByContact[0].id },
            data: { previousSessionDue: item.preBal }
          });
          updateCount++;
        } else {
          notFound.push(item);
        }
      } else {
        notFound.push(item);
      }
    } else {
      // multiple matches
      console.log(`Multiple matches for ${item.name} / ${item.father}`);
      notFound.push(item);
    }
  }

  console.log(`Matched and updated: ${updateCount} out of ${studentsData.length}`);
  if (notFound.length > 0) {
    console.log(`Not found (${notFound.length}):`);
    notFound.forEach(n => console.log(`${n.name} / ${n.father}`));
  }
}

updateDues()
  .then(() => console.log('Done'))
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
