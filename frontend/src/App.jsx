import { useEffect, useState } from "react";
import "./App.css";

const API =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function App() {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("novaUser")) || null
  );

  const [token, setToken] = useState(
    localStorage.getItem("novaToken") || ""
  );

  const [isRegister, setIsRegister] = useState(false);

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [activeProject, setActiveProject] = useState(null);
  const [activeTab, setActiveTab] = useState("Dashboard");

  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "Medium",
  });

  const [loading, setLoading] = useState(false);

  // ---------------- AUTH ----------------

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isRegister ? "register" : "login";

      const response = await fetch(`${API}/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(authForm),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Authentication failed");
        return;
      }

      localStorage.setItem("novaToken", data.token);
      localStorage.setItem("novaUser", JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);

      setAuthForm({
        name: "",
        email: "",
        password: "",
      });
    } catch (error) {
      alert("Backend server is not running.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("novaToken");
    localStorage.removeItem("novaUser");

    setToken("");
    setUser(null);
    setProjects([]);
    setTasks([]);
    setActiveProject(null);
  }

  // ---------------- PROJECTS ----------------

  async function fetchProjects() {
    try {
      const response = await fetch(`${API}/projects`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setProjects(data);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function createProject(e) {
    e.preventDefault();

    if (!projectForm.name.trim()) {
      alert("Project name is required");
      return;
    }

    try {
      const response = await fetch(`${API}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectForm),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      setProjectForm({
        name: "",
        description: "",
      });

      await fetchProjects();

      alert("Project created successfully!");
    } catch (error) {
      alert("Unable to create project");
    }
  }

  async function deleteProject(projectId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${API}/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      if (activeProject?._id === projectId) {
        setActiveProject(null);
        setTasks([]);
      }

      fetchProjects();
    } catch (error) {
      alert("Unable to delete project");
    }
  }

  async function updateProject(projectId, progress, status) {
    try {
      await fetch(`${API}/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          progress,
          status,
        }),
      });

      fetchProjects();

      if (activeProject?._id === projectId) {
        setActiveProject({
          ...activeProject,
          progress,
          status,
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function addMember(projectId, email) {
    if (!email.trim()) {
      alert("Enter team member email");
      return;
    }

    try {
      const response = await fetch(`${API}/projects/${projectId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to add member");
        return;
      }

      setProjects((prevProjects) =>
        prevProjects.map((project) =>
          project._id === projectId ? data : project
        )
      );

      if (activeProject?._id === projectId) {
        setActiveProject(data);
      }

      alert("Team member added successfully!");
    } catch (error) {
      console.error(error);
      alert("Unable to add team member");
    }
  }

  // ---------------- TASKS ----------------

  async function fetchTasks() {
    try {
      const response = await fetch(`${API}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setTasks(data);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function createTask(e) {
    e.preventDefault();

    if (!activeProject) {
      alert("Select a project first");
      return;
    }

    if (!taskForm.title.trim()) {
      alert("Task title is required");
      return;
    }

    try {
      const response = await fetch(`${API}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...taskForm,
          project: activeProject._id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      setTaskForm({
        title: "",
        description: "",
        priority: "Medium",
      });

      await fetchTasks();
      await fetchProjects();

      alert("Task created successfully!");
    } catch (error) {
      alert("Unable to create task");
    }
  }

  async function updateTask(taskId, status) {
    try {
      await fetch(`${API}/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
        }),
      });

      fetchTasks();
    } catch (error) {
      console.error(error);
    }
  }

  async function deleteTask(taskId) {
    const confirmed = window.confirm("Delete this task?");

    if (!confirmed) return;

    try {
      const response = await fetch(`${API}/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      fetchTasks();
    } catch (error) {
      alert("Unable to delete task");
    }
  }

  // ---------------- EFFECTS ----------------

  useEffect(() => {
    if (token) {
      fetchProjects();
      fetchTasks();
    }
  }, [token]);

  // ---------------- LOGIN SCREEN ----------------

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">N</div>

          <h1>NOVA</h1>

          <p className="auth-tagline">
            Plan. Collaborate. Deliver.
          </p>

          <h2>
            {isRegister
              ? "Create your account"
              : "Welcome back"}
          </h2>

          <p className="auth-description">
            {isRegister
              ? "Start managing your projects with NOVA."
              : "Sign in to continue to your workspace."}
          </p>

          <form onSubmit={handleAuth}>
            {isRegister && (
              <div className="input-group">
                <label>Full Name</label>

                <input
                  type="text"
                  placeholder="Enter your name"
                  value={authForm.name}
                  onChange={(e) =>
                    setAuthForm({
                      ...authForm,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>
            )}

            <div className="input-group">
              <label>Email</label>

              <input
                type="email"
                placeholder="you@example.com"
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({
                    ...authForm,
                    email: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="input-group">
              <label>Password</label>

              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({
                    ...authForm,
                    password: e.target.value,
                  })
                }
                required
              />
            </div>

            <button className="auth-button" disabled={loading}>
              {loading
                ? "Please wait..."
                : isRegister
                ? "Create Account"
                : "Sign In"}
            </button>
          </form>

          <div className="auth-switch">
            {isRegister
              ? "Already have an account?"
              : "Don't have an account?"}

            <button
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? "Sign In" : "Create Account"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- DASHBOARD ----------------

  const myTasks = activeProject
    ? tasks.filter(
        (task) => task.project?._id === activeProject._id
      )
    : tasks;

  const completedTasks = myTasks.filter(
    (task) => task.status === "Completed"
  ).length;

  const activeTasks = myTasks.filter(
    (task) => task.status !== "Completed"
  ).length;

  return (
    <div className="app">
      {/* SIDEBAR */}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">N</div>

          <div>
            <strong>NOVA</strong>
            <small>Productivity</small>
          </div>
        </div>

        <nav className="nav">
          <button
            className={
              activeTab === "Dashboard"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() => setActiveTab("Dashboard")}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className={
              activeTab === "Projects"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() => setActiveTab("Projects")}
          >
            <span>▣</span>
            Projects
          </button>

          <button
            className={
              activeTab === "Tasks"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() => setActiveTab("Tasks")}
          >
            <span>✓</span>
            Tasks
          </button>

          <button
            className={
              activeTab === "Team"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() => setActiveTab("Team")}
          >
            <span>◉</span>
            Team
          </button>
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user.name?.charAt(0).toUpperCase()}
          </div>

          <div className="user-details">
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>

          <button className="logout-button" onClick={logout}>
            ↪
          </button>
        </div>
      </aside>

      {/* MAIN */}

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">NOVA WORKSPACE</span>
            <h1>{activeTab}</h1>
          </div>

          <div className="top-user">
            <span>Welcome, {user.name}</span>

            <div className="top-avatar">
              {user.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* DASHBOARD */}

        {activeTab === "Dashboard" && (
          <>
            <section className="welcome-card">
              <div>
                <span className="welcome-label">
                  YOUR WORKSPACE
                </span>

                <h2>
                  Welcome back, {user.name.split(" ")[0]} 👋
                </h2>

                <p>
                  Manage your projects, tasks and team from one
                  powerful workspace.
                </p>
              </div>

              <button
                className="primary-button"
                onClick={() => setActiveTab("Projects")}
              >
                + New Project
              </button>
            </section>

            <section className="stats">
              <div className="stat-card">
                <span>Total Projects</span>
                <strong>{projects.length}</strong>
                <small>Your active workspace</small>
              </div>

              <div className="stat-card">
                <span>Total Tasks</span>
                <strong>{tasks.length}</strong>
                <small>Across all projects</small>
              </div>

              <div className="stat-card">
                <span>Active Tasks</span>
                <strong>{activeTasks}</strong>
                <small>Tasks in progress</small>
              </div>

              <div className="stat-card">
                <span>Completed</span>
                <strong>{completedTasks}</strong>
                <small>Tasks completed</small>
              </div>
            </section>

            <section className="dashboard-grid">
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>Recent Projects</h3>
                    <p>Your latest projects</p>
                  </div>

                  <button
                    className="link-button"
                    onClick={() => setActiveTab("Projects")}
                  >
                    View all →
                  </button>
                </div>

                {projects.length === 0 ? (
                  <div className="empty">
                    <div>📁</div>
                    <h3>No projects yet</h3>
                    <p>Create your first project to get started.</p>

                    <button
                      className="primary-button"
                      onClick={() => setActiveTab("Projects")}
                    >
                      Create Project
                    </button>
                  </div>
                ) : (
                  projects.slice(0, 4).map((project) => (
                    <div
                      className="project-row"
                      key={project._id}
                      onClick={() => {
                        setActiveProject(project);
                        setActiveTab("Tasks");
                      }}
                    >
                      <div className="project-icon">
                        {project.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="project-info">
                        <strong>{project.name}</strong>

                        <span>
                          {project.description ||
                            "No description"}
                        </span>

                        <div className="progress">
                          <div
                            style={{
                              width: `${project.progress}%`,
                            }}
                          />
                        </div>
                      </div>

                      <b>{project.progress}%</b>
                    </div>
                  ))
                )}
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>My Tasks</h3>
                    <p>Tasks across your projects</p>
                  </div>

                  <button
                    className="link-button"
                    onClick={() => setActiveTab("Tasks")}
                  >
                    View all →
                  </button>
                </div>

                {tasks.length === 0 ? (
                  <div className="empty small">
                    <div>✓</div>
                    <h3>No tasks yet</h3>
                    <p>Create a task inside a project.</p>
                  </div>
                ) : (
                  tasks.slice(0, 5).map((task) => (
                    <div className="task-row" key={task._id}>
                      <div
                        className={
                          task.status === "Completed"
                            ? "task-check done"
                            : "task-check"
                        }
                      >
                        {task.status === "Completed"
                          ? "✓"
                          : ""}
                      </div>

                      <div className="task-info">
                        <strong>{task.title}</strong>
                        <span>
                          {task.project?.name || "Project"}
                        </span>
                      </div>

                      <em className={`priority ${task.priority}`}>
                        {task.priority}
                      </em>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        {/* PROJECTS */}

        {activeTab === "Projects" && (
          <section>
            <div className="page-title">
              <div>
                <h2>Projects</h2>
                <p>Create and manage your team projects.</p>
              </div>
            </div>

            <div className="projects-layout">
              <div className="panel">
                <h3>Create New Project</h3>

                <form onSubmit={createProject}>
                  <div className="input-group">
                    <label>Project Name</label>

                    <input
                      type="text"
                      placeholder="e.g. Website Redesign"
                      value={projectForm.name}
                      onChange={(e) =>
                        setProjectForm({
                          ...projectForm,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="input-group">
                    <label>Description</label>

                    <textarea
                      placeholder="What is this project about?"
                      value={projectForm.description}
                      onChange={(e) =>
                        setProjectForm({
                          ...projectForm,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>

                  <button className="primary-button">
                    Create Project
                  </button>
                </form>
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>Your Projects</h3>
                    <p>{projects.length} projects</p>
                  </div>
                </div>

                <div className="project-list">
                  {projects.length === 0 ? (
                    <div className="empty">
                      <div>📁</div>
                      <h3>No projects found</h3>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <div
                        className="project-card"
                        key={project._id}
                      >
                        <div className="project-card-top">
                          <div className="project-icon large">
                            {project.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <h3>{project.name}</h3>
                            <p>
                              {project.description ||
                                "No description"}
                            </p>
                          </div>
                        </div>

                        <div className="project-meta">
                          <span>{project.status}</span>
                          <strong>
                            {project.progress}%
                          </strong>
                        </div>

                        <div className="progress big">
                          <div
                            style={{
                              width: `${project.progress}%`,
                            }}
                          />
                        </div>

                        <div className="project-actions">
                          <button
                            className="secondary-button"
                            onClick={() => {
                              setActiveProject(project);
                              setActiveTab("Tasks");
                            }}
                          >
                            Manage Tasks
                          </button>

                          <button
                            className="danger-button"
                            onClick={() =>
                              deleteProject(project._id)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TASKS */}

        {activeTab === "Tasks" && (
          <section>
            <div className="page-title">
              <div>
                <h2>Task Management</h2>
                <p>
                  Create, update and track your project tasks.
                </p>
              </div>

              {activeProject && (
                <span className="selected-project">
                  {activeProject.name}
                </span>
              )}
            </div>

            <div className="panel">
              {!activeProject ? (
                <div className="select-project">
                  <div>📋</div>
                  <h3>Select a project</h3>
                  <p>
                    Choose a project from Projects to manage
                    its tasks.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() => setActiveTab("Projects")}
                  >
                    View Projects
                  </button>
                </div>
              ) : (
                <>
                  <h3>Add New Task</h3>

                  <form
                    className="task-form"
                    onSubmit={createTask}
                  >
                    <input
                      placeholder="Task title"
                      value={taskForm.title}
                      onChange={(e) =>
                        setTaskForm({
                          ...taskForm,
                          title: e.target.value,
                        })
                      }
                    />

                    <input
                      placeholder="Description"
                      value={taskForm.description}
                      onChange={(e) =>
                        setTaskForm({
                          ...taskForm,
                          description: e.target.value,
                        })
                      }
                    />

                    <select
                      value={taskForm.priority}
                      onChange={(e) =>
                        setTaskForm({
                          ...taskForm,
                          priority: e.target.value,
                        })
                      }
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>

                    <button className="primary-button">
                      Add Task
                    </button>
                  </form>
                </>
              )}
            </div>

            {activeProject && (
              <div className="task-board">
                {["Todo", "In Progress", "Completed"].map(
                  (status) => (
                    <div className="task-column" key={status}>
                      <div className="column-title">
                        <h3>{status}</h3>

                        <span>
                          {
                            myTasks.filter(
                              (task) =>
                                task.status === status
                            ).length
                          }
                        </span>
                      </div>

                      {myTasks
                        .filter(
                          (task) => task.status === status
                        )
                        .map((task) => (
                          <div
                            className="task-card"
                            key={task._id}
                          >
                            <div className="task-card-header">
                              <strong>{task.title}</strong>

                              <button
                                className="task-delete"
                                onClick={() =>
                                  deleteTask(task._id)
                                }
                              >
                                ×
                              </button>
                            </div>

                            <p>
                              {task.description ||
                                "No description"}
                            </p>

                            <span
                              className={`priority ${task.priority}`}
                            >
                              {task.priority}
                            </span>

                            <select
                              value={task.status}
                              onChange={(e) =>
                                updateTask(
                                  task._id,
                                  e.target.value
                                )
                              }
                            >
                              <option value="Todo">
                                Todo
                              </option>
                              <option value="In Progress">
                                In Progress
                              </option>
                              <option value="Completed">
                                Completed
                              </option>
                            </select>
                          </div>
                        ))}
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        )}

        {/* TEAM */}

        {activeTab === "Team" && (
          <section className="team-page">
            <div className="page-title">
              <div>
                <h2>Team</h2>
                <p>Collaborate with your project team.</p>
              </div>
            </div>

            {!activeProject ? (
              <div className="panel">
                <div className="select-project">
                  <div>👥</div>
                  <h3>Select a project</h3>
                  <p>
                    Choose a project from Projects to view and manage your team.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => setActiveTab("Projects")}
                  >
                    View Projects
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>{activeProject.name} Team</h3>
                      <p>
                        {activeProject.members?.length || 0} team member
                        {activeProject.members?.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <div className="project-list">
                    {activeProject.members?.map((member) => (
                      <div className="project-row" key={member._id}>
                        <div className="user-avatar">
                          {member.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                          <strong>{member.name}</strong>
                          <small>{member.email}</small>
                        </div>
                        {member._id === activeProject.owner?._id && (
                          <span className="member-badge">Owner</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <h3>Add Team Member</h3>
                  <p>Invite an existing NOVA user using their email address.</p>

                  <form
                    className="task-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const email = e.target.email.value;
                      addMember(activeProject._id, email);
                      e.target.reset();
                    }}
                  >
                    <input
                      name="email"
                      type="email"
                      placeholder="team.member@example.com"
                      required
                    />
                    <button className="primary-button">Add Member</button>
                  </form>
                </div>
              </>
            )}
          </section>
        )}

      </main>
    </div>
  );
}

export default App;