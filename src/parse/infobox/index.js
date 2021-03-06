const i18n = require('../../data/i18n');
const findRecursive = require('../../lib/recursive_match');
const parseInfobox = require('./infobox');
const parseCitation = require('./citation');

const infobox_reg = new RegExp('{{(' + i18n.infoboxes.join('|') + ')[: \n]', 'ig');
//dont remove these ones
const keep = {
  main: true,
  'main article': true,
  'wide image': true,
  coord: true
};

//reduce the scary recursive situations
const parse_recursive = function(r, wiki, options) {
  //remove {{template {{}} }} recursions
  r.infoboxes = [];
  let matches = findRecursive('{', '}', wiki).filter(s => s[0] && s[1] && s[0] === '{' && s[1] === '{');
  matches.forEach(function(tmpl) {
    if (tmpl.match(infobox_reg, 'ig')) {
      let infobox = parseInfobox(tmpl);
      r.infoboxes.push(infobox);
      wiki = wiki.replace(tmpl, '');
      return;
    }
    //keep these ones, we'll parse them later
    let name = tmpl.match(/^\{\{([^:|\n ]+)/);
    if (name !== null) {
      name = name[1].trim().toLowerCase();
      //
      if (/^\{\{ ?citation needed/i.test(tmpl) === true) {
        name = 'citation needed';
      }

      //parse {{cite web ...}} (it appears every language)
      if (name === 'cite' || name === 'citation') {
        wiki = parseCitation(tmpl, wiki, r);
        return;
      }

      //sorta-keep nowrap template
      if (name === 'nowrap') {
        let inside = tmpl.match(/^\{\{nowrap *?\|(.*?)\}\}$/);
        if (inside) {
          wiki = wiki.replace(tmpl, inside[1]);
        }
      }
      if (keep[name] === true) {
        return;
      }
    }
    //let everybody add a custom parser for this template
    if (options.custom) {
      Object.keys(options.custom).forEach(k => {
        let val = options.custom[k](tmpl, wiki);
        if (val || val === false) {
          //dont store all the nulls
          r.custom[k] = r.custom[k] || [];
          r.custom[k].push(val);
        }
      });
    }
    //if it's not a known template, but it's recursive, remove it
    //(because it will be misread later-on)
    wiki = wiki.replace(tmpl, '');
  });
  // //ok, now that the scary recursion issues are gone, we can trust simple regex methods..
  // //kill the rest of templates
  wiki = wiki.replace(/\{\{ *?(^(main|wide)).*?\}\}/g, '');

  return wiki;
};

module.exports = parse_recursive;
