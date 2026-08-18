"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoveRight, Link as LinkIcon } from "lucide-react";

const jobPositions = [
  {
    timeline: "May 2022 — Present",
    currentPosition: "CRM Salesforce Student Administrator",
    place: "University of St. Thomas",
    description:
      `Collaborated with stakeholders to document requirements, define project scope, and implement solutions across various university applications. Led the development of interactive front-end widgets in partnership with the Admissions Department to enhance the UI/UX of the college application system.`,
    skills: [
      "Salesforce",
      "HTML",
      "CSS",
      "JavaScript",
      "Jira",
      "UI/UX Design",
      "Agile",
      "Planning",
      "Leadership",
      "Testing & QA",
      "Git"
    ],
  },
  {
    timeline: "June 2024 — June 2025",
    currentPosition: "Software Developer Intern",
    place: "Games For Love",
    description:
      `Directed a team in developing monthly video games using Godot. Managed UI/UX improvements for the organization's itch.io platform to increase user engagement and participation in game jams.`,
    skills: [
      "Godot",
      "HTML",
      "CSS",
      "JavaScript",
      "Figma",
      "UI/UX Design",
      "Project Management",
      "Planning",
      "Leadership",
      "Testing & QA",
      "Git",
    ],
  },
  {
    timeline: "Feb 2022 — May 2022",
    currentPosition: "Computer Science Tutor",
    place: "University of St. Thomas",
    description:
      `Provided personalized tutoring for Computer Science students in the Introduction to Programming course. Focused on problem-solving techniques and coding assignments.`,
    skills: [
      "Python",
      "Problem-Solving",
      "Communication",
    ],
  },
];

export default function ExpCard() {
  return (
    <section id="experiences" className="scroll-mt-16 lg:mt-16" data-section="experiences">
      <div className="sticky top-0 z-20 -mx-6 mb-4 w-screen bg-background/0 px-6 py-5 backdrop-blur md:-mx-12 md:px-12 lg:sr-only lg:relative lg:top-auto lg:mx-auto lg:w-full lg:px-0 lg:py-0 lg:opacity-0">
        <h2 className="shiny text-xl font-bold uppercase tracking-widest text-start lg:sr-only">
          Experience
        </h2>
      </div>
      <div className="flex flex-col gap-4 mb-8">
        <h2 className="shiny hidden text-3xl font-bold lg:block lg:text-start">
          Experience
        </h2>
      </div>
      <>
        {jobPositions.map((job, index) => (
          <Card
            key={index}
            className="p-6 mb-8 lg:flex-row w-full min-h-fit gap-0 lg:gap-5 border border-border/60 bg-card/70 backdrop-blur shadow-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          >
            <CardHeader className="p-0 mb-4 border-l-2 border-primary pl-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                  {job.timeline}
                </span>
                <p className="text-lg lg:text-xl text-primary font-bold group-hover:text-primary transition-colors">
                  {job.currentPosition}
                </p>
                <p className="text-sm text-muted-foreground font-medium">
                  {job.place}
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <CardDescription className="py-3 text-muted-foreground leading-relaxed">
                {job.description}
              </CardDescription>
              {/* {job.link && (
                <a 
                  href={job.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label={`View ${job.linkName || "work"} for ${job.currentPosition} at ${job.place}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all duration-200 mb-4 mt-2 w-fit"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  {job.linkName || "View Work"}
                </a>
              )} */}
              <CardFooter className="p-0 flex flex-wrap gap-2 pt-3">
                {job.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </CardFooter>
            </CardContent>
          </Card>
        ))}
      </>
      <div className="mt-12 flex">
        <a
          className="inline-flex items-center font-medium leading-tight text-foreground hover:text-primary transition-colors group"
          href="/Francis_Tran_Resume.pdf" target="_blank" aria-label="Download Francis Tran's full resume PDF"
        >
          <span className="border-transparent pb-px transition hover:border-primary motion-reduce:transition-none">
            View Full Resume
          </span>
          <MoveRight className="ml-1 inline-block h-5 w-5 shrink-0 -translate-y-px transition-transform group-hover:translate-x-2 group-focus-visible:translate-x-2 motion-reduce:transition-none" />
        </a>
      </div>
    </section>
  );
}