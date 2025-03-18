const pluginRss = require("@11ty/eleventy-plugin-rss");
const codeStyleHooks = require("eleventy-plugin-code-style-hooks");

module.exports = function (eleventyConfig) {
  // Copy the contents of the `public` folder to the output folder
  // For example, `./public/css/` ends up in `_site/css/`
  eleventyConfig.addPassthroughCopy({
    "./public/": "/",
  });

  eleventyConfig.addPlugin(codeStyleHooks, {
    lineNumbers: false,
  });

  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addLiquidFilter("dateToRfc3339", pluginRss.dateToRfc3339);
  eleventyConfig.addLiquidFilter(
    "getNewestCollectionItemDate",
    pluginRss.getNewestCollectionItemDate
  );

  // Run Eleventy when these files change:
  // https://www.11ty.dev/docs/watch-serve/#add-your-own-watch-targets

  // Watch content images for the image pipeline.
  eleventyConfig.addWatchTarget("content/**/*.{svg,webp,png,jpeg}");

  eleventyConfig.addFilter("postTags", (tags) => {
    return Object.keys(tags)
      .filter((k) => k !== "posts")
      .filter((k) => k !== "all")
      .map((k) => ({ name: k, count: tags[k].length }))
      .sort((a, b) => b.count - a.count);
  });

  // Add a filter to strip HTML
  eleventyConfig.addFilter("stripHTML", (content) => {
    if (!content) return '';
    return content.replace(/<\/?[^>]+(>|$)/g, "");
  });
  
  // Add a filter to count words
  eleventyConfig.addFilter("wordCount", (content) => {
    if (!content) return 0;
    return content.trim().split(/\s+/).length;
  });

  // Add a filter to group posts by year
  eleventyConfig.addFilter("groupByYear", (posts) => {
    const postsByYear = {};
    
    // Group posts by year
    posts.forEach(post => {
      const year = new Date(post.date).getFullYear();
      if (!postsByYear[year]) {
        postsByYear[year] = [];
      }
      postsByYear[year].push(post);
    });
    
    // Convert to array format sorted by year (descending)
    return Object.keys(postsByYear)
      .sort((a, b) => b - a)
      .map(year => ({
        year,
        posts: postsByYear[year]
      }));
  });

  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").reverse();
  });

  eleventyConfig.addLiquidFilter(
    "similarPosts",
    function (collection, path, tags) {
      if (!collection) return [];
      let similarPosts = collection
        .filter((post) => {
          return (
            getSimilarTags(post.data.tags, tags) >= 1 &&
            post.data.page.inputPath !== path
          );
        })
        .sort((a, b) => {
          return (
            getSimilarTags(b.data.tags, tags) -
            getSimilarTags(a.data.tags, tags)
          );
        });
      if (similarPosts.length < 4) {
        similarPosts = similarPosts
          .concat(collection.slice(0, 3))
          .filter((post) => post.data.page.inputPath !== path);
      }
      return getUniquePosts(similarPosts);
    }
  );

  return {
    // Control which files Eleventy will process
    // e.g.: *.md, *.njk, *.html, *.liquid
    templateFormats: ["md", "njk", "html", "liquid"],

    // Pre-process *.md files with: (default: `liquid`)
    markdownTemplateEngine: "njk",

    // Pre-process *.html files with: (default: `liquid`)
    htmlTemplateEngine: "njk",

    // These are all optional:
    dir: {
      input: "src", // default: "."
    },

    // -----------------------------------------------------------------
    // Optional items:
    // -----------------------------------------------------------------

    // If your site deploys to a subdirectory, change `pathPrefix`.
    // Read more: https://www.11ty.dev/docs/config/#deploy-to-a-subdirectory-with-a-path-prefix

    // When paired with the HTML <base> plugin https://www.11ty.dev/docs/plugins/html-base/
    // it will transform any absolute URLs in your HTML to include this
    // folder name and does **not** affect where things go in the output folder.
    pathPrefix: "/",
  };
};

const getSimilarTags = function (categoriesA, categoriesB) {
  if (!categoriesA) return [];
  return categoriesA.filter(Set.prototype.has, new Set(categoriesB)).length;
};

const getUniquePosts = function (posts) {
  const field = "url";
  const uniqueValues = new Set();
  return posts.filter((item) => {
    if (!uniqueValues.has(item[field])) {
      uniqueValues.add(item[field]);
      return true;
    }
    return false;
  });
};
