/**
 * Phase 4: Mock LinkedIn Scraper Service
 * In a production environment, this would call an API like Proxycurl or RapidAPI.
 * Due to LinkedIn's aggressive bot protection, we simulate the scraping delay and return realistic structured data.
 */

const mockFetchLinkedInProfile = async (linkedinUrl) => {
  // Simulate network delay (1.5 seconds)
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Extract a username-ish string from the URL for realism
  const parts = linkedinUrl.split('/').filter(Boolean);
  const username = parts[parts.length - 1] || 'user';

  // Return realistic mocked data that a scraping API would provide
  return {
    profileUrl: linkedinUrl,
    scrapedAt: new Date().toISOString(),
    headline: 'Software Engineer | React & Node.js Enthusiast',
    currentCompany: 'Tech Solutions Inc.',
    currentTitle: 'Senior Full Stack Developer',
    location: 'San Francisco Bay Area',
    about: 'Experienced developer specializing in MERN stack applications with a passion for clean UI and scalable architectures.',
    skills: ['React.js', 'Node.js', 'MongoDB', 'Express.js', 'TypeScript', 'GraphQL', 'AWS'],
    experience: [
      {
        title: 'Senior Full Stack Developer',
        company: 'Tech Solutions Inc.',
        duration: 'Jan 2022 - Present',
      },
      {
        title: 'Frontend Developer',
        company: 'WebDev Agency',
        duration: 'Mar 2019 - Dec 2021',
      }
    ],
    education: [
      {
        degree: 'B.S. Computer Science',
        school: 'University of California, Berkeley',
        year: '2018',
      }
    ]
  };
};

module.exports = {
  fetchLinkedInProfile: mockFetchLinkedInProfile,
};
