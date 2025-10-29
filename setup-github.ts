/**
 * GitHub Repository Setup Script
 * This script creates a new GitHub repository for MenuFlow
 */

import { getUncachableGitHubClient } from './server/github-client.js';

async function setupGitHubRepo() {
  try {
    console.log('🔄 Connecting to GitHub...');
    const octokit = await getUncachableGitHubClient();

    // Get authenticated user info
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`✅ Connected as: ${user.login}`);

    // Create repository
    console.log('\n📦 Creating repository "menuflow"...');
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: 'menuflow',
      description: 'MenuFlow - QR Code Digital Menu Platform for Restaurants',
      private: false, // Set to true if you want a private repo
      auto_init: false,
      has_issues: true,
      has_projects: true,
      has_wiki: true,
    });

    console.log(`✅ Repository created successfully!`);
    console.log(`\n📍 Repository URL: ${repo.html_url}`);
    console.log(`📍 Clone URL: ${repo.clone_url}`);
    console.log(`📍 SSH URL: ${repo.ssh_url}`);

    // Create .gitignore
    console.log('\n📝 Creating .gitignore...');
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: user.login,
      repo: 'menuflow',
      path: '.gitignore',
      message: 'Add .gitignore',
      content: Buffer.from(`# Dependencies
node_modules/
.pnpm-debug.log

# Environment variables
.env
.env.local
.env*.local

# Build outputs
dist/
build/
.next/
.vercel/

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Logs
logs/
*.log
npm-debug.log*

# Database
*.db
*.sqlite

# Temp files
.tmp/
temp/
`).toString('base64'),
    });

    console.log('\n✅ Setup complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. In Replit Shell, run these commands:');
    console.log('   git init');
    console.log(`   git remote add origin ${repo.clone_url}`);
    console.log('   git add .');
    console.log('   git commit -m "Initial commit: MenuFlow project"');
    console.log('   git branch -M main');
    console.log('   git push -u origin main');
    console.log('\n2. Your code will be available at:');
    console.log(`   ${repo.html_url}`);

  } catch (error: any) {
    if (error.status === 422 && error.message.includes('already exists')) {
      console.error('❌ Repository "menuflow" already exists in your account');
      console.log('\nOptions:');
      console.log('1. Delete the existing repository and run this script again');
      console.log('2. Use a different repository name by modifying this script');
      console.log('3. Push to the existing repository manually');
    } else {
      console.error('❌ Error:', error.message);
      console.error(error);
    }
    process.exit(1);
  }
}

setupGitHubRepo();
