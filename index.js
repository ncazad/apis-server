const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

app.enable("trust proxy");
app.set("json spaces", 2);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

let settings = {};
try {
  const settingsPath = path.join(__dirname, 'settings.json');
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
} catch (error) {
  console.error('Error loading settings:', error.message);
  settings = { apiSettings: { operator: "Created Azadx69x" } };
}

app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    if (data && typeof data === 'object') {
      const responseData = {
        status: data.status,
        operator: (settings.apiSettings && settings.apiSettings.operator) || "Created Azadx69x",
        ...data
      };
      return originalJson.call(this, responseData);
    }
    return originalJson.call(this, data);
  };
  next();
});

const apiFolder = path.join(__dirname, 'api');
let totalRoutes = 0;
const apiModules = [];

const loadModules = (dir) => {
  if (!fs.existsSync(dir)) {
    console.log(`API folder not found: ${dir}`);
    return;
  }
  
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      loadModules(filePath);
    } else if (fs.statSync(filePath).isFile() && path.extname(file) === '.js') {
      try {
        const module = require(filePath);
        if (!module.meta || !module.onStart || typeof module.onStart !== 'function') {
          console.warn(`Invalid module in ${filePath}: Missing or invalid meta/onStart`);
          return;
        }

        const basePath = module.meta.path.split('?')[0];
        const routePath = '/api' + basePath;
        const method = (module.meta.method || 'get').toLowerCase();
        
        app[method](routePath, (req, res) => {
          module.onStart({ req, res });
        });
        
        apiModules.push({
          name: module.meta.name,
          description: module.meta.description,
          category: module.meta.category,
          path: routePath + (module.meta.path.includes('?') ? '?' + module.meta.path.split('?')[1] : ''),
          author: module.meta.author,
          method: module.meta.method || 'get'
        });
        
        totalRoutes++;
        console.log(`Loaded Route: ${module.meta.name} (${method.toUpperCase()})`);
      } catch (error) {
        console.error(`Error loading module ${filePath}: ${error.message}`);
      }
    }
  });
};

loadModules(apiFolder);
console.log(`Load Complete! Total Routes Loaded: ${totalRoutes}`);

app.get('/api/info', (req, res) => {
  const categories = {};
  apiModules.forEach(module => {
    if (!categories[module.category]) {
      categories[module.category] = {
        name: module.category,
        items: []
      };
    }
    categories[module.category].items.push({
      name: module.name,
      desc: module.description,
      path: module.path,
      author: module.author,
      method: module.method
    });
  });
  res.json({ categories: Object.values(categories) });
});

app.use(express.static(path.join(__dirname, 'website')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'website', 'dirim.html'));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'website', '404.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(path.join(__dirname, 'website', '500.html'));
});

module.exports = app;
