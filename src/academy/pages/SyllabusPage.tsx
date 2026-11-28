import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Archive, BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CourseDialog } from "@/academy/components/CourseDialog";
import { useMcqApi } from "@/mcq/lib/api";
import { Picker, ListState } from "@/academy/components/common";
import CourseImage from "@/academy/components/CourseImage";
import type { Course, CourseTopic } from "@/academy/lib/academy";

type SyllabusCourse = Course & { canEdit: boolean };

function Topics({ course }: { course: SyllabusCourse }) {
  const api = useMcqApi();
  const { toast } = useToast();
  const [form, setForm] = useState({ subject: "", title: "" });
  const key = ["/api/courses", course._id, "topics"];
  const { data: topics = [], isLoading, error } = useQuery({ queryKey: key, queryFn: () => api.get<CourseTopic[]>(`/api/courses/${course._id}/topics`) });
  // Lecture dialogs read the same syllabus through Student Progress.
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ["/api/progress/courses", course._id, "topics"] });
  };
  const failed = (err: Error) => toast({ title: "Not saved", description: err.message, variant: "destructive" });
  const add = useMutation({
    mutationFn: () => api.post(`/api/progress/courses/${course._id}/topics`, form),
    onSuccess: () => { refresh(); setForm({ subject: form.subject, title: "" }); },
    onError: failed,
  });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/api/progress/topics/${id}`), onSuccess: refresh, onError: failed });

  return (
    <div className="space-y-3">
      <CourseImage course={course} readOnly={!course.canEdit} />
      {course.canEdit && (
        <form className="flex gap-2 flex-wrap" onSubmit={(e) => { e.preventDefault(); if (form.title.trim()) add.mutate(); }}>
          <Input className="w-full sm:w-40" placeholder="Subject or module" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} aria-label="Subject or module" data-testid="input-topic-subject" />
          <Input className="flex-1 min-w-[180px]" placeholder="Topic" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="Topic" data-testid="input-topic-title" />
          <Button type="submit" disabled={!form.title.trim() || add.isPending} data-testid="button-add-topic">Add Topic</Button>
        </form>
      )}
      <ListState isLoading={isLoading} error={error} isEmpty={topics.length === 0} emptyText="No topics yet" icon={BookOpen}>
        <ol className="divide-y rounded-md border" data-testid="list-syllabus">
          {topics.map((t, i) => (
            <li key={t._id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>{i + 1}. {t.subject && <span className="text-muted-foreground">{t.subject} · </span>}{t.title}</span>
              {course.canEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" aria-label={`Remove ${t.title}`} onClick={() => remove.mutate(t._id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              )}
            </li>
          ))}
        </ol>
      </ListState>
    </div>
  );
}

export default function SyllabusPage() {
  const { user } = useAuth();
  const api = useMcqApi();
  const { toast } = useToast();
  const [courseId, setCourseId] = useState("");
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [archiving, setArchiving] = useState(false);
  const { data: courses = [], isLoading, error } = useQuery({ queryKey: ["/api/courses", "syllabus"], queryFn: () => api.get<SyllabusCourse[]>("/api/courses/syllabus") });
  const course = courses.find((c) => c._id === courseId) || (courses.length === 1 ? courses[0] : undefined);

  const role = user?.role;
  // The server allows the same: admins and teachers create; editing follows canEdit; only admins archive.
  const canCreate = role === "org_admin" || role === "teacher";
  const archive = useMutation({
    mutationFn: (id: string) => api.delete(`/api/courses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      setCourseId("");
      setArchiving(false);
      toast({ title: "Course archived" });
    },
    onError: (err: Error) => toast({ title: "Not archived", description: err.message, variant: "destructive" }),
  });
  const subtitle = role === "student" ? "The syllabus of the courses you are taking"
    : role === "teacher" ? "The syllabus of the courses you teach. A course's topics are its total portion; lectures that name a topic complete it for each student present."
      : "A course's topics are its total portion. Lectures that name a topic complete it for each student present.";

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Syllabus</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {canCreate && <Button onClick={() => setDialog("create")} data-testid="button-new-course"><Plus className="w-4 h-4 mr-2" />New Course</Button>}
      </div>
      <ListState isLoading={isLoading} error={error} isEmpty={courses.length === 0} emptyText="No courses to show yet" icon={BookOpen}>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="w-full max-w-sm">
            <Picker label="Course" value={course?._id || ""} onChange={setCourseId} options={courses.map((c) => ({ value: c._id, label: c.title }))} testId="select-syllabus-course" />
          </div>
          {course?.canEdit && (
            <Button variant="outline" onClick={() => setDialog("edit")} data-testid="button-edit-course"><Pencil className="w-4 h-4 mr-2" />Edit Course</Button>
          )}
          {course && role === "org_admin" && (
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setArchiving(true)} data-testid="button-archive-course"><Archive className="w-4 h-4 mr-2" />Archive</Button>
          )}
        </div>
        {course && (course.duration || course.description) && (
          <p className="text-sm text-muted-foreground max-w-2xl">
            {course.duration && <span className="font-medium text-foreground">{course.duration}</span>}
            {course.duration && course.description && " · "}
            {course.description}
          </p>
        )}
        {course ? <Topics key={course._id} course={course} /> : <p className="text-sm text-muted-foreground">Choose a course to see its topics.</p>}
      </ListState>

      <CourseDialog
        open={!!dialog}
        course={dialog === "edit" ? course : undefined}
        onClose={() => setDialog(null)}
        onSaved={(saved) => { setDialog(null); setCourseId(saved._id); }}
      />

      <AlertDialog open={archiving} onOpenChange={(o) => { if (!o) setArchiving(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {course?.title}?</AlertDialogTitle>
            <AlertDialogDescription>It disappears from the Syllabus and from new batches. Existing batches, lectures and student progress stay.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => course && archive.mutate(course._id)} data-testid="button-confirm-archive-course">Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
