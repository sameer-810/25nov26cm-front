import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMcqApi } from "@/mcq/lib/api";
import type { Course } from "@/academy/lib/academy";

interface Props {
  open: boolean;
  // The course being edited; none to create one.
  course?: Course;
  onClose: () => void;
  onSaved: (course: Course) => void;
}

const EMPTY = { title: "", description: "", duration: "" };

// Create or edit a course's details. Its topics are managed on the Syllabus page, its cover image there too.
export function CourseDialog({ open, course, onClose, onSaved }: Props) {
  const api = useMcqApi();
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) setForm(course ? { title: course.title, description: course.description || "", duration: course.duration || "" } : EMPTY);
  }, [open, course]);

  const save = useMutation({
    mutationFn: () => (course ? api.put<Course>(`/api/courses/${course._id}`, form) : api.post<Course>("/api/courses", form)),
    onSuccess: (saved) => {
      // Batch forms and the Syllabus page both list courses under this key.
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: course ? "Course updated" : "Course created" });
      onSaved(saved);
    },
    onError: (err: Error) => toast({ title: "Not saved", description: err.message, variant: "destructive" }),
  });

  const ready = form.title.trim().length > 0 && !save.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{course ? "Edit Course" : "New Course"}</DialogTitle>
          <DialogDescription>A course holds the syllabus. Batches of students then take it with a teacher.</DialogDescription>
        </DialogHeader>
        <form id="course-form" className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (ready) save.mutate(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="course-title">Title</Label>
            <Input id="course-title" value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Full Stack Development" data-testid="input-course-title" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="course-duration">Duration <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="course-duration" value={form.duration} maxLength={100} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 6 months" data-testid="input-course-duration" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="course-description">Description <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="course-description" value={form.description} maxLength={2000} rows={2} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-course-description" />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="course-form" disabled={!ready} data-testid="button-save-course">
            {save.isPending ? "Saving..." : course ? "Save Changes" : "Create Course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
