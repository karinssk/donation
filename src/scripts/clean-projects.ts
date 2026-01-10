import dotenv from 'dotenv';
import { connectDB } from '../db/mongodb';
import Project from '../models/Project';
import mongoose from 'mongoose';

dotenv.config();

async function cleanProjects() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    console.log('Cleaning project names and descriptions...');

    const projects = await Project.find();

    for (const project of projects) {
      let updated = false;

      if (project.name && project.name !== project.name.trim()) {
        project.name = project.name.trim();
        updated = true;
      }

      if (project.description && project.description !== project.description.trim()) {
        project.description = project.description.trim();
        updated = true;
      }

      if (updated) {
        await project.save();
        console.log(`Updated project: ${project.name} (${project._id})`);
      }
    }

    console.log(`Cleaned ${projects.length} projects`);

    await mongoose.connection.close();
    console.log('Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning projects:', error);
    process.exit(1);
  }
}

cleanProjects();
