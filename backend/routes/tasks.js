const express = require("express");
const Task = require("../models/Task");
const Project = require("../models/Project");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Automatically calculate project progress
async function updateProjectProgress(projectId) {
  const tasks = await Task.find({ project: projectId });

  if (tasks.length === 0) {
    await Project.findByIdAndUpdate(projectId, {
      progress: 0,
      status: "Planning",
    });
    return;
  }

  const completedTasks = tasks.filter(
    (task) => task.status === "Completed"
  ).length;

  const progress = Math.round(
    (completedTasks / tasks.length) * 100
  );

  let status = "Active";

  if (progress === 0) {
    status = "Planning";
  } else if (progress === 100) {
    status = "Completed";
  }

  await Project.findByIdAndUpdate(projectId, {
    progress,
    status,
  });
}


// GET ALL TASKS
router.get("/", authMiddleware, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user.id },
        { members: req.user.id },
      ],
    }).select("_id");

    const projectIds = projects.map(
      (project) => project._id
    );

    const tasks = await Task.find({
      project: { $in: projectIds },
    })
      .populate("project", "name")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch tasks",
    });
  }
});


// CREATE TASK
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      project,
      priority,
      assignedTo,
      dueDate,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required",
      });
    }

    const projectExists = await Project.findOne({
      _id: project,
      $or: [
        { owner: req.user.id },
        { members: req.user.id },
      ],
    });

    if (!projectExists) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description || "",
      project,
      priority: priority || "Medium",
      assignedTo: assignedTo || null,
      dueDate: dueDate || null,
    });

    await updateProjectProgress(project);

    const populatedTask = await Task.findById(task._id)
      .populate("project", "name")
      .populate("assignedTo", "name email");

    res.status(201).json(populatedTask);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create task",
    });
  }
});


// UPDATE TASK
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findOne({
      _id: task.project,
      $or: [
        { owner: req.user.id },
        { members: req.user.id },
      ],
    });

    if (!project) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    const {
      title,
      description,
      status,
      priority,
      assignedTo,
      dueDate,
    } = req.body;

    task.title = title ?? task.title;
    task.description = description ?? task.description;
    task.status = status ?? task.status;
    task.priority = priority ?? task.priority;
    task.assignedTo = assignedTo ?? task.assignedTo;
    task.dueDate = dueDate ?? task.dueDate;

    await task.save();

    await updateProjectProgress(task.project);

    const updatedTask = await Task.findById(task._id)
      .populate("project", "name")
      .populate("assignedTo", "name email");

    res.json(updatedTask);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update task",
    });
  }
});


// DELETE TASK
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findOne({
      _id: task.project,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    const projectId = task.project;

    await Task.findByIdAndDelete(req.params.id);

    await updateProjectProgress(projectId);

    res.json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to delete task",
    });
  }
});

module.exports = router;