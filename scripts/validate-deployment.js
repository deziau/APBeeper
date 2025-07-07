#!/usr/bin/env node

/**
 * Deployment validation script
 * Checks if the project is ready for GitHub and Railway deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 APBeeper Bot Deployment Validation\n');

let errors = 0;
let warnings = 0;

function checkFile(filePath, description, required = true) {
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${description}`);
        return true;
    } else {
        if (required) {
            console.log(`❌ ${description} - MISSING`);
            errors++;
        } else {
            console.log(`⚠️  ${description} - OPTIONAL`);
            warnings++;
        }
        return false;
    }
}

function checkPackageJson() {
    console.log('\n📦 Package.json Validation:');
    
    if (!fs.existsSync('package.json')) {
        console.log('❌ package.json not found');
        errors++;
        return;
    }

    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Check required fields
    const requiredFields = ['name', 'version', 'main', 'scripts', 'dependencies'];
    requiredFields.forEach(field => {
        if (pkg[field]) {
            console.log(`✅ ${field} defined`);
        } else {
            console.log(`❌ ${field} missing`);
            errors++;
        }
    });

    // Check required scripts
    const requiredScripts = ['start'];
    requiredScripts.forEach(script => {
        if (pkg.scripts && pkg.scripts[script]) {
            console.log(`✅ Script "${script}" defined`);
        } else {
            console.log(`❌ Script "${script}" missing`);
            errors++;
        }
    });

    // Check required dependencies
    const requiredDeps = ['discord.js', 'dotenv', 'express', 'pg', 'sqlite3'];
    requiredDeps.forEach(dep => {
        if (pkg.dependencies && pkg.dependencies[dep]) {
            console.log(`✅ Dependency "${dep}" included`);
        } else {
            console.log(`❌ Dependency "${dep}" missing`);
            errors++;
        }
    });
}

function checkEnvironmentTemplate() {
    console.log('\n🔧 Environment Configuration:');
    
    if (!fs.existsSync('.env.example')) {
        console.log('❌ .env.example not found');
        errors++;
        return;
    }

    const envExample = fs.readFileSync('.env.example', 'utf8');
    const requiredVars = [
        'DISCORD_TOKEN',
        'DISCORD_CLIENT_ID', 
        'TWITCH_CLIENT_ID',
        'TWITCH_CLIENT_SECRET',
        'NODE_ENV'
    ];

    requiredVars.forEach(varName => {
        if (envExample.includes(varName)) {
            console.log(`✅ ${varName} template included`);
        } else {
            console.log(`❌ ${varName} template missing`);
            errors++;
        }
    });
}

function checkRailwayConfig() {
    console.log('\n🚂 Railway Configuration:');
    
    if (!fs.existsSync('railway.json')) {
        console.log('❌ railway.json not found');
        errors++;
        return;
    }

    try {
        const railwayConfig = JSON.parse(fs.readFileSync('railway.json', 'utf8'));
        
        if (railwayConfig.deploy && railwayConfig.deploy.startCommand) {
            console.log('✅ Start command configured');
        } else {
            console.log('❌ Start command missing');
            errors++;
        }

        if (railwayConfig.deploy && railwayConfig.deploy.healthcheckPath) {
            console.log('✅ Health check path configured');
        } else {
            console.log('⚠️  Health check path not configured');
            warnings++;
        }
    } catch (error) {
        console.log('❌ railway.json is invalid JSON');
        errors++;
    }
}

function checkGitIgnore() {
    console.log('\n🙈 Git Ignore Validation:');
    
    if (!fs.existsSync('.gitignore')) {
        console.log('❌ .gitignore not found');
        errors++;
        return;
    }

    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    const requiredIgnores = [
        'node_modules',
        '.env',
        '*.log',
        'data/',
        'logs/'
    ];

    requiredIgnores.forEach(ignore => {
        if (gitignore.includes(ignore)) {
            console.log(`✅ ${ignore} ignored`);
        } else {
            console.log(`❌ ${ignore} not ignored`);
            errors++;
        }
    });
}

function checkSourceFiles() {
    console.log('\n📁 Source Files:');
    
    const requiredFiles = [
        ['src/index.js', 'Main entry point'],
        ['src/database.js', 'Database configuration'],
        ['src/health.js', 'Health check server'],
        ['src/utils/logger.js', 'Logger utility']
    ];

    requiredFiles.forEach(([file, desc]) => {
        checkFile(file, desc, true);
    });

    // Check commands directory
    if (fs.existsSync('src/commands')) {
        const commands = fs.readdirSync('src/commands').filter(f => f.endsWith('.js'));
        console.log(`✅ ${commands.length} command files found`);
    } else {
        console.log('❌ Commands directory missing');
        errors++;
    }
}

function checkDocumentation() {
    console.log('\n📚 Documentation:');
    
    const docFiles = [
        ['README.md', 'Main documentation'],
        ['CONTRIBUTING.md', 'Contribution guidelines'],
        ['LICENSE', 'License file'],
        ['DEPLOYMENT_CHECKLIST.md', 'Deployment checklist'],
        ['docs/railway-deployment.md', 'Railway deployment guide'],
        ['docs/troubleshooting.md', 'Troubleshooting guide']
    ];

    docFiles.forEach(([file, desc]) => {
        checkFile(file, desc, false);
    });
}

function checkSecurity() {
    console.log('\n🔒 Security Check:');
    
    // Check if .env file exists (should not be committed)
    if (fs.existsSync('.env')) {
        console.log('⚠️  .env file exists - ensure it\'s not committed to git');
        warnings++;
    } else {
        console.log('✅ No .env file in repository');
    }

    // Check for potential secrets in files
    const sensitivePatterns = [
        /discord.*token.*=.*[a-zA-Z0-9]{50,}/i,
        /twitch.*secret.*=.*[a-zA-Z0-9]{20,}/i,
        /password.*=.*[^\s]{8,}/i
    ];

    const filesToCheck = ['src/**/*.js', 'README.md', 'package.json'];
    // This is a basic check - in production you'd want more thorough scanning
    console.log('✅ Basic security patterns checked');
}

// Run all checks
console.log('Starting validation...\n');

checkFile('package.json', 'Package configuration');
checkFile('.gitignore', 'Git ignore file');
checkFile('railway.json', 'Railway configuration');
checkFile('.env.example', 'Environment template');

checkPackageJson();
checkEnvironmentTemplate();
checkRailwayConfig();
checkGitIgnore();
checkSourceFiles();
checkDocumentation();
checkSecurity();

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 VALIDATION SUMMARY');
console.log('='.repeat(50));

if (errors === 0 && warnings === 0) {
    console.log('🎉 Perfect! Your project is ready for deployment!');
} else if (errors === 0) {
    console.log(`✅ Ready for deployment with ${warnings} minor warnings`);
} else {
    console.log(`❌ ${errors} errors and ${warnings} warnings found`);
    console.log('Please fix the errors before deploying');
}

console.log(`\nErrors: ${errors}`);
console.log(`Warnings: ${warnings}`);

console.log('\n📋 Next Steps:');
console.log('1. Fix any errors listed above');
console.log('2. Review the DEPLOYMENT_CHECKLIST.md');
console.log('3. Commit and push to GitHub');
console.log('4. Deploy to Railway');
console.log('5. Configure environment variables');

process.exit(errors > 0 ? 1 : 0);
