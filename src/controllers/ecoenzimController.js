import ecoenzimProject from "../models/ecoenzimProject.js";
import ecoenzimUploadProgress from "../models/ecoenzimUploadProgress.js";

// =================== PROJECT CONTROLLER ===================

// GET all projects
export const getProjects = async (req, res) => {
  try {
    const projects = await ecoenzimProject.find().populate("userId");
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET project by ID
export const getProjectById = async (req, res) => {
  try {
    const project = await ecoenzimProject.findById(req.params.id).populate("userId");
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE project
export const createProject = async (req, res) => {
  try {
    const project = new ecoenzimProject(req.body);
    await project.save();
    res.status(201).json({ message: "Project created", project });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE project otomatis
export const updateProjectStatus = async (projectId) => {
  const project = await ecoenzimProject.findById(projectId);
  if (!project) return null;

  // Hitung jumlah upload verified
  const verifiedUploads = await ecoenzimUploadProgress.countDocuments({
    ecoenzimProjectId: project._id,
    status: "verified"
  });

  const today = new Date();

  if (verifiedUploads >= 3) {
    project.status = "completed";
    project.canClaim = true;
  } else if (today > project.endDate && verifiedUploads < 3) {
    project.status = "cancelled";
    project.canClaim = false;
  } else {
    project.status = "ongoing";
    project.canClaim = false;
  }

  await project.save();
  return project;
};

// =================== UPLOAD CONTROLLER ===================

// GET all uploads
export const getAllUploads = async (req, res) => {
  try {
    const uploads = await ecoenzimUploadProgress.find().populate("userId ecoenzimProjectId");
    res.json(uploads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET uploads by project
export const getUploadsByProject = async (req, res) => {
  try {
    const uploads = await ecoenzimUploadProgress.find({ ecoenzimProjectId: req.params.projectId }).populate("userId");
    res.json(uploads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE upload
export const createUpload = async (req, res) => {
  try {
    const upload = new ecoenzimUploadProgress(req.body);
    await upload.save();

    // Auto update project status
    const project = await updateProjectStatus(upload.ecoenzimProjectId);

    res.status(201).json({ message: "Upload created and project status updated", upload, project });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// VERIFY upload (simulasi admin otomatis)
export const verifyUpload = async (req, res) => {
  try {
    const upload = await ecoenzimUploadProgress.findById(req.params.id);
    if (!upload) return res.status(404).json({ message: "Upload not found" });

    upload.status = "verified";
    await upload.save();

    const project = await updateProjectStatus(upload.ecoenzimProjectId);

    res.json({ message: "Upload verified and project status updated", upload, project });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CLAIM points
export const claimPoints = async (req, res) => {
  try {
    const project = await ecoenzimProject.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (!project.canClaim) return res.status(400).json({ message: "Cannot claim yet" });

    const uploads = await ecoenzimUploadProgress.find({
      ecoenzimProjectId: project._id,
      status: "verified"
    });

    const totalPrePoints = uploads.reduce((sum, u) => sum + (u.prePointsEarned || 0), 0);

    project.points = totalPrePoints;
    project.prePointsEarned = null;
    project.canClaim = false;
    project.isClaimed = true;
    project.claimedAt = new Date();
    project.status = "completed";

    await project.save();

    res.json({ message: "Points claimed", project });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const autoCancelExpiredProjects = async () => {
  try {
    const today = new Date();

    // Cari project ongoing yang endDate sudah lewat dan belum diklaim
    const expiredProjects = await ecoenzimProject.find({
      status: "ongoing",
      endDate: { $lt: today },
      isClaimed: false,
    });

    for (const project of expiredProjects) {
      // Jika project belum punya cukup upload verified (< 3)
      const verifiedUploads = await ecoenzimUpload.countDocuments({
        ecoenzimProjectId: project.id,
        status: "verified",
      });

      if (verifiedUploads < 3) {
        project.status = "cancelled";
        project.canClaim = false;
        project.updatedAt = new Date();
        await project.save();
        console.log(`🚫 Project ${project.id} otomatis dibatalkan.`);
      }
    }

    console.log("✅ Auto cancel check selesai.");
  } catch (error) {
    console.error("❌ Error auto-cancel:", error);
  }
};
