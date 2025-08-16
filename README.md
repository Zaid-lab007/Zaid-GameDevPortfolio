# 3D Portfolio - Creative Developer Showcase

A stunning, interactive 3D portfolio built with Three.js, featuring modern web technologies and beautiful animations.

## ✨ Features

- **Interactive 3D Hero Section** - Floating geometric shapes with smooth animations
- **Multiple 3D Project Previews** - Each project showcases different Three.js capabilities
- **Responsive Design** - Optimized for all devices and screen sizes
- **Smooth Animations** - GSAP-powered transitions and scroll effects
- **Modern UI/UX** - Clean, professional design with gradient accents
- **Performance Optimized** - Efficient Three.js rendering and resource management

## 🚀 Technologies Used

- **Three.js** - 3D graphics and WebGL rendering
- **GSAP** - Advanced animations and timeline control
- **Vite** - Fast development server and build tool
- **Modern CSS** - CSS Grid, Flexbox, and custom properties
- **Vanilla JavaScript** - ES6+ features and modern APIs

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd 3d-portfolio
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🎨 Customization

### Colors and Themes
Modify the CSS custom properties in `style.css`:
```css
:root {
  --primary-color: #6366f1;
  --secondary-color: #8b5cf6;
  --accent-color: #06b6d4;
  /* ... more variables */
}
```

### 3D Content
Customize the Three.js scenes in `main.js`:
- **Hero Scene**: Modify `createFloatingShapes()` for different geometric shapes
- **Project Scenes**: Update `createProjectContent()` for custom project previews
- **Materials**: Change colors, textures, and lighting effects

### Content
Update the HTML content in `index.html`:
- Personal information and bio
- Project descriptions and technologies
- Contact information and social links

## 📱 Responsive Design

The portfolio is fully responsive with:
- Mobile-first approach
- Flexible grid layouts
- Adaptive 3D canvas sizing
- Touch-friendly interactions

## 🔧 Project Structure

```
3d-portfolio/
├── index.html          # Main HTML structure
├── style.css           # Styles and animations
├── main.js             # Three.js and application logic
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite configuration
└── README.md           # Project documentation
```

## 🎯 Performance Tips

- **Three.js Optimization**: Use `BufferGeometry` for large meshes
- **Texture Management**: Implement texture compression and LOD
- **Animation Efficiency**: Use `requestAnimationFrame` and GSAP ticker
- **Memory Management**: Dispose of unused geometries and materials

## 🌟 Adding New Projects

1. **Create a new project card** in the HTML
2. **Add a new canvas container** with unique ID
3. **Extend the project scenes** in `main.js`
4. **Customize the 3D content** for your project

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Netlify/Vercel
- Connect your repository
- Set build command: `npm run build`
- Set publish directory: `dist`

### Deploy to GitHub Pages
```bash
npm run build
git add dist
git commit -m "Deploy to GitHub Pages"
git subtree push --prefix dist origin gh-pages
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Three.js Community** - For the amazing 3D library
- **GSAP Team** - For powerful animation tools
- **Vite Team** - For the fast build tool
- **WebGL Community** - For pushing the boundaries of web graphics

## 📞 Support

If you have any questions or need help:
- Open an issue on GitHub
- Check the Three.js documentation
- Review the GSAP documentation

---

**Built with ❤️ and Three.js**

*Transform your portfolio into an immersive 3D experience!*

