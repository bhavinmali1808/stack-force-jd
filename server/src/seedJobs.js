const mongoose = require('mongoose');
require('dotenv').config();
const Role = require('./models/Role');
const Company = require('./models/Company');

const NAUKRI_JOBS_SEED = [
  {
    "jobId": "RESUMING-001",
    "title": "Senior Backend Engineer - Distributed Systems",
    "company": {
      "name": "Razorpay Technologies",
      "rating": 4.4,
      "reviewsCount": 1250
    },
    "location": {
      "city": "Bangalore",
      "area": "Koramangala",
      "workMode": "Hybrid"
    },
    "experience": {
      "min": 4,
      "max": 8
    },
    "salary": {
      "min": 2800000,
      "max": 4200000,
      "currency": "INR",
      "period": "per annum",
      "disclosed": true
    },
    "skills": ["Go", "Distributed Systems", "Kafka", "PostgreSQL", "Kubernetes"],
    "education": {
      "ug": "B.Tech/B.E. in Computer Science or CS related field",
      "pg": "M.Tech / M.S. (Optional)"
    },
    "industry": "FinTech & Financial Services",
    "department": "Engineering - Software & QA",
    "roleCategory": "Software Development",
    "role": "Backend Developer",
    "employmentType": "Full Time",
    "employerType": "Company",
    "jobDescription": "Build ultra-low-latency payment processing pipelines handling billions of daily transactions. Requires deep experience in Go/Java, event streaming (Kafka/RabbitMQ), and database optimization.",
    "postedDate": "2026-07-28",
    "applyUrl": "https://resuming.io/apply/RESUMING-001",
    "vacancies": 4
  },
  {
    "jobId": "RESUMING-002",
    "title": "Lead Full Stack Engineer (React + Node.js)",
    "company": {
      "name": "Swiggy Labs",
      "rating": 4.2,
      "reviewsCount": 3100
    },
    "location": {
      "city": "Bangalore",
      "area": "HSR Layout",
      "workMode": "Hybrid"
    },
    "experience": {
      "min": 5,
      "max": 9
    },
    "salary": {
      "min": 3200000,
      "max": 4800000,
      "currency": "INR",
      "period": "per annum",
      "disclosed": true
    },
    "skills": ["React.js", "Node.js", "TypeScript", "Redis", "AWS", "System Design"],
    "education": {
      "ug": "B.Tech/B.E. or MCA",
      "pg": "Any Postgraduate"
    },
    "industry": "Consumer Internet & E-commerce",
    "department": "Engineering - Software & QA",
    "roleCategory": "Software Development",
    "role": "Full Stack Developer",
    "employmentType": "Full Time",
    "employerType": "Company",
    "jobDescription": "Lead a high-impact team building consumer-facing web experiences and scalable node microservices serving millions of active users.",
    "postedDate": "2026-07-29",
    "applyUrl": "https://resuming.io/apply/RESUMING-002",
    "vacancies": 2
  },
  {
    "jobId": "RESUMING-003",
    "title": "Senior AI / Machine Learning Infrastructure Engineer",
    "company": {
      "name": "Fractal Analytics",
      "rating": 4.1,
      "reviewsCount": 890
    },
    "location": {
      "city": "Mumbai",
      "area": "Bandra Kurla Complex (BKC)",
      "workMode": "Remote"
    },
    "experience": {
      "min": 3,
      "max": 7
    },
    "salary": {
      "min": 2400000,
      "max": 3800000,
      "currency": "INR",
      "period": "per annum",
      "disclosed": true
    },
    "skills": ["Python", "PyTorch", "vLLM", "Docker", "FastAPI", "Ray"],
    "education": {
      "ug": "B.Tech/B.E. in Data Science / CS",
      "pg": "M.Tech / M.S. in Machine Learning"
    },
    "industry": "Artificial Intelligence & Analytics",
    "department": "Data Science & Machine Learning",
    "roleCategory": "Machine Learning Engineer",
    "role": "AI Infrastructure Lead",
    "employmentType": "Full Time",
    "employerType": "Company",
    "jobDescription": "Architect LLM serving pipelines, GPU cluster scheduling, and high-throughput model inference APIs.",
    "postedDate": "2026-07-30",
    "applyUrl": "https://resuming.io/apply/RESUMING-003",
    "vacancies": 3
  },
  {
    "jobId": "RESUMING-004",
    "title": "Principal DevOps & Cloud Platform Engineer",
    "company": {
      "name": "Zomato Tech",
      "rating": 4.3,
      "reviewsCount": 2400
    },
    "location": {
      "city": "Gurgaon",
      "area": "DLF Cyber City",
      "workMode": "Work From Office"
    },
    "experience": {
      "min": 6,
      "max": 12
    },
    "salary": {
      "min": 4000000,
      "max": 6000000,
      "currency": "INR",
      "period": "per annum",
      "disclosed": true
    },
    "skills": ["Kubernetes", "AWS", "Terraform", "Prometheus", "ArgoCD", "Helm"],
    "education": {
      "ug": "B.Tech/B.E. in Computer Science",
      "pg": "Any Postgraduate"
    },
    "industry": "Internet & Software Products",
    "department": "DevOps & Infrastructure",
    "roleCategory": "DevOps",
    "role": "Cloud Architect",
    "employmentType": "Full Time",
    "employerType": "Company",
    "jobDescription": "Manage multi-region Kubernetes clusters supporting 100k+ requests per second with 99.99% uptime guarantees.",
    "postedDate": "2026-07-27",
    "applyUrl": "https://resuming.io/apply/RESUMING-004",
    "vacancies": 1
  },
  {
    "jobId": "RESUMING-005",
    "title": "Senior Frontend Developer (React + Next.js)",
    "company": {
      "name": "Cred",
      "rating": 4.5,
      "reviewsCount": 780
    },
    "location": {
      "city": "Bangalore",
      "area": "Indiranagar",
      "workMode": "Hybrid"
    },
    "experience": {
      "min": 3,
      "max": 6
    },
    "salary": {
      "min": 2500000,
      "max": 3500000,
      "currency": "INR",
      "period": "per annum",
      "disclosed": true
    },
    "skills": ["React.js", "Next.js", "TypeScript", "TailwindCSS", "Web Performance"],
    "education": {
      "ug": "B.Tech / B.E. / BCA / B.Sc Computer Science",
      "pg": "Any"
    },
    "industry": "FinTech Products",
    "department": "Frontend Engineering",
    "roleCategory": "Software Development",
    "role": "Frontend Developer",
    "employmentType": "Full Time",
    "employerType": "Company",
    "jobDescription": "Craft world-class UI micro-animations, optimize Core Web Vitals, and build delightful user interfaces.",
    "postedDate": "2026-07-30",
    "applyUrl": "https://resuming.io/apply/RESUMING-005",
    "vacancies": 2
  },
  {
    "jobId": "RESUMING-006",
    "title": "Data Engineering Manager",
    "company": {
      "name": "PhonePe",
      "rating": 4.4,
      "reviewsCount": 1900
    },
    "location": {
      "city": "Hyderabad",
      "area": "Gachibowli",
      "workMode": "Hybrid"
    },
    "experience": {
      "min": 7,
      "max": 12
    },
    "salary": {
      "min": 4500000,
      "max": 6500000,
      "currency": "INR",
      "period": "per annum",
      "disclosed": true
    },
    "skills": ["Apache Spark", "Snowflake", "Python", "Airflow", "Data Warehousing"],
    "education": {
      "ug": "B.Tech/B.E. in CS or IT",
      "pg": "M.Tech or MBA (Preferred)"
    },
    "industry": "Digital Payments & Financial Services",
    "department": "Data Analytics & Engineering",
    "roleCategory": "Data Engineering",
    "role": "Data Engineer",
    "employmentType": "Full Time",
    "employerType": "Company",
    "jobDescription": "Oversee enterprise data warehouse pipelines processing petabytes of real-time transactional metrics.",
    "postedDate": "2026-07-26",
    "applyUrl": "https://resuming.io/apply/RESUMING-006",
    "vacancies": 1
  }
];

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/talentforce';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing sample roles
    await Role.deleteMany({});
    console.log('Cleared old role records.');

    for (const item of NAUKRI_JOBS_SEED) {
      let company = await Company.findOne({ name: item.company.name });
      if (!company) {
        const slug = item.company.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        company = await Company.create({
          name: item.company.name,
          email: `careers@${slug || 'company'}.com`,
          passwordHash: '$2a$10$7R4d.e6K1X3fP4Z1w2J3e.u4V5W6X7Y8Z9A0B1C2D3E4F5G6H7I8J',
          rating: item.company.rating,
          reviewsCount: item.company.reviewsCount,
          industry: item.industry,
          description: `${item.company.name} is hiring top talent via Resuming.io`,
          website: 'https://resuming.io',
        });
      }

      await Role.create({
        company: company._id,
        jobId: item.jobId,
        title: item.title,
        description: item.jobDescription,
        requiredSkills: item.skills,
        experienceLevel: `${item.experience.min}-${item.experience.max} yrs`,
        minExperience: item.experience.min,
        maxExperience: item.experience.max,
        location: `${item.location.city}, ${item.location.area}`,
        workMode: item.location.workMode,
        salaryRange: `₹${(item.salary.min / 100000).toFixed(1)} - ${(item.salary.max / 100000).toFixed(1)} LPA`,
        education: item.education.ug,
        industry: item.industry,
        department: item.department,
        roleCategory: item.roleCategory,
        employmentType: item.employmentType,
        applyUrl: item.applyUrl,
        vacancies: item.vacancies,
        isActive: true,
      });

      console.log(`✅ Seeded Job: ${item.title} @ ${item.company.name}`);
    }

    console.log('\n🚀 Database successfully populated with Naukri Standard Jobs!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedDatabase();
