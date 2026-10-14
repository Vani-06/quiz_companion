
const dashboardData = {
  user: {
    name: "Chethan",
    role: "Skill Explorer",
    level: "Intermediate",
  },
  stats: [
    { label: "Skills Learned", value: 12, change: "+3 this month" },
    { label: "Learning Hours", value: 48, change: "+8 this week" },
    { label: "Skill Matches", value: 24, change: "5 new matches" },
    { label: "Sessions Completed", value: 16, change: "+4 this month" },
  ],
  weeklyActivity: [
    { day: "Mon", hours: 2 },
    { day: "Tue", hours: 3 },
    { day: "Wed", hours: 1.5 },
    { day: "Thu", hours: 4 },
    { day: "Fri", hours: 2.5 },
    { day: "Sat", hours: 5 },
    { day: "Sun", hours: 3 },
  ],
  matches: [
    {
      id: 1,
      name: "Aarav Sharma",
      initials: "AS",
      skill: "UI/UX Design",
      offering: "UI/UX Design",
      seeking: "React Development",
      compatibility: 96,
      color: "#9b8cff",
    },
    {
      id: 2,
      name: "Maya Patel",
      initials: "MP",
      skill: "Python",
      offering: "Python",
      seeking: "Data Visualization",
      compatibility: 91,
      color: "#43e6c5",
    },
    {
      id: 3,
      name: "Rohan Mehta",
      initials: "RM",
      skill: "Video Editing",
      offering: "Video Editing",
      seeking: "Graphic Design",
      compatibility: 87,
      color: "#ffb86b",
    },
  ],
  sessions: [
    {
      id: 1,
      title: "React Fundamentals",
      partner: "Aarav Sharma",
      date: "Today",
      time: "6:00 PM",
      duration: "45 min",
      icon: "code",
    },
    {
      id: 2,
      title: "Python for Beginners",
      partner: "Maya Patel",
      date: "Tomorrow",
      time: "4:30 PM",
      duration: "60 min",
      icon: "brain",
    },
  ],
  goals: [
    { id: 1, title: "Master React", progress: 72, color: "#9b8cff" },
    { id: 2, title: "Learn UI/UX", progress: 48, color: "#43e6c5" },
    { id: 3, title: "Data Visualization", progress: 35, color: "#ffb86b" },
  ],
};

export async function getDashboardData() {
  return dashboardData;
}
