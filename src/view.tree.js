class TreeView {
  constructor($dom, adapter) {
    this.treeData = 
      {
        "name": "40b3384",
        "parent": "null",
        "children": [
          {
            "name": "0b78aed",
            "parent": "40b3384",
            "children": [
              {
                "name": "763773c",
                "parent": "0b78aed",
                "children": [
                  {
                    "name": "e42a651",
                    "parent": "763773c",
                    "children": [
                      {
                        "name": "be134de",
                        "parent": "e42a651",
                        "children": [
                          {
                            "name": "375941f",
                            "parent": "be134de",
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };
    this.treeData = [];
    this.adapter = adapter;
    this.$view = $dom.find('.octotree-tree-view');

    // this.$tree = this.$view
    //   .find('.octotree-view-body')
    //   .html(`<svg>${this.chart}</svg>`)

    // this.$tree.html($(".octotree-view-body").html());
    // console.log(this.$tree);

  }

  get $jstree() {
    return;
  }

  focus() {
  }

  show(repo, token) {
    $(document).trigger(EVENT.REPO_LOADED, { repo });
    if (this.treeData.length > 0){
      this.chart = this._chart(this.treeData);
    } else {
      this._initialScreen()
    }
    $(this).trigger(EVENT.VIEW_READY);

    this._showHeader(repo);
  }

  _showHeader(repo) {
    const adapter = this.adapter;

    this.$view
      .find('.octotree-view-header')
      .html(
        `<div class="octotree-header-summary">
          <div class="octotree-header-repo">
            <i class="octotree-icon-repo"></i>
            <a href="/${repo.username}">${repo.username}</a> /
            <a data-pjax href="/${repo.username}/${repo.reponame}">${repo.reponame}</a>
          </div>
          <div class="octotree-header-branch">
            <i class="octotree-icon-branch"></i>
            ${deXss((repo.displayBranch || repo.branch).toString())}
          </div>
          <div class="octotree-header-selection">
            <label class="selection-text">Selected Code Element</label>
            <input id="codeElementField" type="text" class="form-control input-block selection-field" readonly/>
          </div>
          <div>
            <button id="codeElementSubmit" class="btn btn-primary octotree-submit-button">Track</button>
          </div>
        </div>`
      )
      .on('click', 'a[data-pjax]', function (event) {
        event.preventDefault();
        // A.href always return absolute URL, don't want that
        const href = $(this).attr('href');
        const newTab = event.shiftKey || event.ctrlKey || event.metaKey;
        newTab ? adapter.openInNewTab(href) : adapter.selectFile(href);
      });

      document.addEventListener('click', function (event) {
        let selection = document.getSelection();
        let selectionText = selection.toString().trim();
        console.log(selectionText);
        if (selectionText !== ""){
          document.getElementById("codeElementField").value = selectionText;
        }
      });
  }

  /**
   * Intercept the _onItemClick method
   * return true to stop the current execution
   * @param {Event} event
   */
  onItemClick(event) {
    return false;
  }

  _onItemClick(event) {
    let $target = $(event.target);
    let download = false;

    if (this.onItemClick(event)) return;

    // Handle icon click, fix #122
    if ($target.is('i.jstree-icon')) {
      $target = $target.parent();
      download = true;
    }

    $target = $target.is('a.jstree-anchor') ? $target : $target.parent();

    if ($target.is('.octotree-patch')) {
      $target = $target.parent();
    }

    if (!$target.is('a.jstree-anchor')) return;

    // Refocus after complete so that keyboard navigation works, fix #158
    const refocusAfterCompletion = () => {
      $(document).one('pjax:success page:load', () => {
        this.$jstree.get_container().focus();
      });
    };

    const adapter = this.adapter;
    const newTab = event.shiftKey || event.ctrlKey || event.metaKey;
    const href = $target.attr('href');
    // The 2nd path is for submodule child links
    const $icon = $target.children().length ? $target.children(':first') : $target.siblings(':first');

    if ($icon.hasClass('commit')) {
      refocusAfterCompletion();
      newTab ? adapter.openInNewTab(href) : adapter.selectSubmodule(href);
    } else if ($icon.hasClass('blob')) {
      if (download) {
        const downloadUrl = $target.attr('data-download-url');
        const downloadFileName = $target.attr('data-download-filename');
        adapter.downloadFile(downloadUrl, downloadFileName);
      } else {
        refocusAfterCompletion();
        newTab ? adapter.openInNewTab(href) : adapter.selectFile(href);
      }
    }
  }

  async syncSelection(repo) {
    const $jstree = this.$jstree;
    if (!$jstree) return;

    // Convert /username/reponame/object_type/branch/path to path
    const path = decodeURIComponent(location.pathname);
    const match = path.match(/(?:[^\/]+\/){4}(.*)/);
    if (!match) return;

    const currentPath = match[1];
    const loadAll = await this.adapter.shouldLoadEntireTree(repo);

    selectPath(loadAll ? [currentPath] : breakPath(currentPath));

    // Convert ['a/b'] to ['a', 'a/b']
    function breakPath(fullPath) {
      return fullPath.split('/').reduce((res, path, idx) => {
        res.push(idx === 0 ? path : `${res[idx - 1]}/${path}`);
        return res;
      }, []);
    }

    function selectPath(paths, index = 0) {
      const nodeId = NODE_PREFIX + paths[index];

      if ($jstree.get_node(nodeId)) {
        $jstree.deselect_all();
        $jstree.select_node(nodeId);
        $jstree.open_node(nodeId, () => {
          if (++index < paths.length) {
            selectPath(paths, index);
          }
        });
      }
    }
  }

  _chart(treeData) {
  var margin = {top: 40, right: 5, bottom: 50, left: 5},
      width = 210 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;
  
  // declares a tree layout and assigns the size
  var treemap = d3.tree()
      .size([width, height]);
  
  //  assigns the data to a hierarchy using parent-child relationships
  var nodes = d3.hierarchy(treeData);
  
  // maps the node data to the tree layout
  nodes = treemap(nodes);
  
  // append the svg obgect to the body of the page
  // appends a 'group' element to 'svg'
  // moves the 'group' element to the top left margin
  
  // var svg = d3.select("body > nav > div.octotree-views > div.octotree-view.octotree-tree-view.current > div.octotree-view-body").append("svg") 

  var svg = d3.select("body > nav > div.octotree-views > div.octotree-view.octotree-tree-view.current > div.octotree-view-body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom),
      g = svg.append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");
  
  // adds the links between the nodes
  var link = g.selectAll(".link")
      .data( nodes.descendants().slice(1))
    .enter().append("path")
      .attr("class", "link")
      .attr("d", function(d) {
         return "M" + d.x + "," + d.y
           + "C" + d.x + "," + (d.y + d.parent.y) / 2
           + " " + d.parent.x + "," +  (d.y + d.parent.y) / 2
           + " " + d.parent.x + "," + d.parent.y;
         });
  
  // adds each node as a group
  var node = g.selectAll(".node")
      .data(nodes.descendants())
    .enter().append("g")
      .attr("class", function(d) { 
        return "node" + 
          (d.children ? " node--internal" : " node--leaf"); })
      .attr("transform", function(d) { 
        return "translate(" + d.x + "," + d.y + ")"; });
  
  // adds the circle to the node
  node.append("circle")
    .attr("r", 10);
  
  // adds the text to the node
  node.append("text")
    .attr("dy", ".35em")
    .attr("y", function(d) { return d.children ? -20 : 20; })
    .style("text-anchor", "middle")
    .text(function(d) { return d.data.name; });
  }

  _initialScreen(){
    const instructions = `
    <div class="octotree-instructions">
      <p>Select a code element to track its refactoring history.</p>
    </div>
    `
    $("body > nav > div.octotree-views > div.octotree-view.octotree-tree-view.current > div.octotree-view-body").append(instructions);
  }
}
