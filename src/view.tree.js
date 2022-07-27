class TreeView {
  constructor($dom, adapter) {
    this.treeData = {};
    this.adapter = adapter;
    this.selectionText;
    this.lineNumber;
    this.filePath;

    this.$view = $dom.find('.octotree-tree-view');
    this.$document = $(document);

    // restore session
    this.sessionFilePath;
    this.sessionMethodName;
  }

  get $jstree() {
    return;
  }

  focus() {
  }

  updateCodeElementSelectionField(selectionText) {
    document.getElementById("codeElementField").value = selectionText;
    this._removeTreeBody();
  }

  async restoreTreeData() {
    try {
      this.treeData = await window.extStore.get(window.STORE.TREE_DATA);
      this.selectionText = await window.extStore.get(window.STORE.SELECTION_TEXT);
      if (this.selectionText) {
        this.updateCodeElementSelectionField(this.selectionText);
      }
      // capture methodname and filepath here
      this.sessionFilePath = await window.extStore.get(window.STORE.FILE_PATH);
      this.sessionMethodName = await window.extStore.get(window.STORE.METHOD_NAME);
    }
    catch (err) {
      console.log("No session", err);
    }
  }

  // scrolling helper functions
  getLineNumberFromDOM = (document, methodName) => {
    let textNode = $(document).find(`span:contains('${methodName}')`);
    const index = textNode.length - 2;
    return textNode[index].parentElement.previousElementSibling.getAttribute("data-line-number");
  };

  getLineNumberFromAPI = async (data) => {
    const { username, reponame, filePath, commitId, methodName } = data;
    let url = `https://api.github.com/repos/${username}/${reponame}/contents/${filePath}?ref=${commitId}`;
    console.log("GETTING ", url);
    let response = await fetch(url).then(response => response.json());
    let content = atob(response.content);
    let lineNumber = lineOf(content, methodName);
    return lineNumber;
  };

  // linenumber of the user selection
  getLineNumberFromDOM_GET = (node) => {
    let lineNumber;
    try {
      lineNumber = node.parentElement.parentElement.previousElementSibling.getAttribute("data-line-number");
    } catch (err) { }

    if (!lineNumber) {
      try {
        lineNumber = node.parentElement.previousElementSibling.getAttribute("data-line-number");
      } catch (err) { }
    }

    return lineNumber;
  }

  // filepath div of the user selection
  getFileDivFromDOM = (node) => {
    if (!node) {
      return null;
    }

    while (node?.getAttribute("data-tagsearch-path") == null) {
      node = node.parentElement;
    }
    return node;
  }

  // filepath of the user selection
  getFilePathFromDOM_GET = (node) => {
    node = this.getFileDivFromDOM(node);
    return node.getAttribute("data-tagsearch-path");
  }

  // get filediv when span is not available
  getFileDivFromFilePath = (filePath) => {
    let textNodes = $(document).find(`div`)
      .contents().filter(
        function () {
          return this.nodeType == 1
            && this.getAttribute("data-tagsearch-path") == filePath;
        });
    return textNodes[0];
  }

  getMethodSpan = (document, methodName) => {
    let textNodes = $(document).find(`span:contains('${methodName}')`)
      .filter(
        function () {
          return this.nodeType == 1
            && this.textContent == methodName;
        });
    return textNodes[textNodes.length - 1];
  };

  expandArrows = (node) => {
    let arrows = $(node).find("a.js-expand");
    for (let arrow of arrows) {
      arrow.click()
    }
    return arrows;
  }

  // scrolling main function
  scrollToCodeElement(filePath, methodName) {
    let counter = 0;

    const scrollAgainAndTry = () => {
      setTimeout(
        () => {
          window.scrollTo(0, document.body.scrollHeight);
          if (!span) {
            span = this.getMethodSpan(this.$document, methodName);
          }
          if (!fileDiv) {
            fileDiv = this.getFileDivFromDOM(span);
            if (!fileDiv) {
              fileDiv = this.getFileDivFromFilePath(filePath);
            }
          }
          this.expandArrows(fileDiv);

          // if span or filediv were not found, scroll more
          if ((!span || !fileDiv) && counter < 5) {
            counter += 1;
            scrollAgainAndTry();
          } else {
            highlightLine(span, fileDiv);
          }
        }, 1000
      );
    }

    const highlightLine = (span, fileDiv) => {
      if (span && fileDiv.getAttribute("data-tagsearch-path") == filePath) {
        let diffHash = span.parentElement.parentElement.previousElementSibling.getAttribute("id");
        if (!diffHash) {
          diffHash = span.parentElement.previousElementSibling.getAttribute("id");
        }
        window.location = window.location + "#" + diffHash;
      }
    }

    let span = this.getMethodSpan(this.$document, methodName);
    let fileDiv = this.getFileDivFromDOM(span);

    if (!fileDiv) {
      fileDiv = this.getFileDivFromFilePath(filePath);
    }

    if (!span || !fileDiv) {
      scrollAgainAndTry();
    }

    highlightLine(span, fileDiv);
    return;
  }

  async show(repo, token) {
    $(document).trigger(EVENT.REPO_LOADED, { repo });
    this._showHeader(repo);
    await this.restoreTreeData();
    if (!window.location.toString().includes("#") && this.sessionMethodName) {
      this.scrollToCodeElement(this.sessionFilePath, this.sessionMethodName);
    }
    console.log("TREEDATA iS nOW", this.treeData);
    if (this.treeData.commitId) {
      this.chart = this._chart(this.treeData, repo);
    } else {
      this._initialScreen()
    }
    $(this).trigger(EVENT.VIEW_READY);
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
            <button id="codeElementReset" class="btn btn-secondary octotree-submit-button">Reset</button>
          </div>
        </div>`
      )
      .on('click', 'a[data-pjax]', (event) => {
        event.preventDefault();
        // A.href always return absolute URL, don't want that
        const href = $(this).attr('href');
        const newTab = event.shiftKey || event.ctrlKey || event.metaKey;
        newTab ? adapter.openInNewTab(href) : adapter.selectFile(href);
      })
      .on('click', '#codeElementSubmit', async (event) => {
        event.preventDefault();
        this._removeTreeBody();
        this.$document.trigger(EVENT.REQ_START);

        const { username, reponame, branch } = repo;
        let selectionText = this.selectionText;
        let filePath = this.filePath;
        let lineNumber = this.lineNumber;

        const params = `owner=${username}&repoName=${reponame}&filePath=${filePath}&commitId=${branch}&methodName=${selectionText}&lineNumber=${lineNumber}`;
        const getRequest = `${API_URL}/method?${params}`;
        console.log(getRequest);
        fetch(getRequest)
          .then(response => response.json())
          .then(async (data) => {
            console.log(data);
            this.treeData = transformDataForTree(data, username, reponame, {
              branch, methodName: selectionText, filePath
            });
            this._chart(this.treeData, repo);
            this.$document.trigger(EVENT.REQ_END);
          });

        const transformDataForTree = (data, username, reponame, currentNode) => {
          let root = { children: [] };
          let treeData = root["children"];
          let { branch } = currentNode;
          data = data.reverse();
          let parent = "null";
          // check if current commit has a refactoring, if not add a dummy checkpoint node
          // let parent = branch.substring(0, 7);
          for (let commit of data) {
            let filePath = commit.after.split("#")[0].replaceAll(".", "/") + '.java';
            let methodName = commit.after.split("#")[1].slice(0, -2)
            let commitIdHash = commit.commitId.substring(0, 7);
            let { changes, date, commitId, committer } = commit;
            let child = {
              name: commitIdHash,
              changes,
              date,
              commitId,
              committer,
              parent,
              filePath,
              methodName,
              username,
              reponame,
              children: []
            }
            treeData.push(child);
            treeData = child['children'];
            parent = commitId;
          }

          // const currentCommitNode = {
          //   name: branch.substring(0, 7),
          //   changes: ["CodeTracker: Initialized on this commit"],
          //   date: $(document).find(`relative-time`)[0].getAttribute("datetime"),
          //   commitId: branch,
          //   committer: $(document).find('.commit-author')[0].innerHTML,
          //   parent: "null",
          //   filePath: currentNode.filePath,
          //   methodName: currentNode.methodName,
          //   username,
          //   reponame,
          //   children: [root.children[0]]
          // }
          // console.log(currentCommitNode);
          // return currentCommitNode;

          console.log(root.children[0]);
          return root.children[0];
        };
      })
      .on('click', '#codeElementReset', async (event) => {
        event.preventDefault();
        this.updateCodeElementSelectionField(null);
        this._initialScreen();
        await window.extStore.set(window.STORE.TREE_DATA, {});
        await window.extStore.set(window.STORE.SELECTION_TEXT, null);
        await window.extStore.set(window.STORE.FILE_PATH, null);
        await window.extStore.set(window.STORE.METHOD_NAME, null);
        this.$document.trigger(EVENT.REQ_END);
        const currentUrl = window.location.toString();
        window.location = currentUrl.split("#")[0];
      })

    document.addEventListener('click', () => {
      captureSelection();
    });

    const captureSelection = () => {
      let selection = document.getSelection();
      let selectionText = selection.toString().trim();
      if (selectionText !== "") {
        this.selectionText = selectionText;
        this.updateCodeElementSelectionField(selectionText);

        let filePath = this.getFilePathFromDOM_GET(selection.anchorNode.parentElement);
        this.filePath = filePath;

        let lineNumber = this.getLineNumberFromDOM_GET(selection.anchorNode.parentElement);
        this.lineNumber = lineNumber;
      }
    }
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

  _chart(treeData, repo) {
    const treeBody = "body > nav > div.octotree-views > div.octotree-view.octotree-tree-view.current > div.octotree-view-body";
    
    let margin = { top: 40, right: 5, bottom: 50, left: 5 },
      width = 210 - margin.left - margin.right,
      height = 620 - margin.top - margin.bottom;

    // declares a tree layout and assigns the size
    let treemap = d3.tree()
      .size([width, height]);

    let svg = d3.select(treeBody).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom),
      g = svg.append("g")
        .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");
      
    //  assigns the data to a hierarchy using parent-child relationships
    let nodes = d3.hierarchy(treeData);

    // maps the node data to the tree layout
    nodes = treemap(nodes);
    
    // adds the links between the nodes
    let link = g.selectAll(".link")
      .data(nodes.descendants().slice(1))
      .enter().append("path")
      .attr("class", "link")
      .attr("d", function (d) {
        return "M" + d.x + "," + d.y
          + "C" + d.x + "," + (d.y + d.parent.y) / 2
          + " " + d.parent.x + "," + (d.y + d.parent.y) / 2
          + " " + d.parent.x + "," + d.parent.y;
      });

    const redirectToCommitPage = async (event) => {
      const data = event.srcElement.__data__.data;
      const { username, reponame, commitId, filePath, methodName } = data;
      let url = `https://github.com/${username}/${reponame}/commit/${commitId}`;
      console.log(url);

      // store all info to storage for next page
      await window.extStore.set(window.STORE.TREE_DATA, this.treeData);
      await window.extStore.set(window.STORE.SELECTION_TEXT, this.selectionText);
      await window.extStore.set(window.STORE.FILE_PATH, filePath);
      await window.extStore.set(window.STORE.METHOD_NAME, methodName);

      window.location = url;
      return url;
    }

    let toolTip = d3.select(treeBody).append("div").attr("class", "treeToolTip");

    const isExpandable = (changes) => {
      for (let change of changes) {
        if (change.includes("introduced: Extract Method")) {
          return true;
        }
      }
      return false;
    }

    // adds each node as a group
    let node = g.selectAll(".node")
      .data(nodes.descendants())
      .enter().append("g")
      .attr("class", function (d) {
        return "node node--internal" + (repo.branch === d.data.commitId ? " node--active" : "") + (isExpandable(d.data.changes) ? " node--expandable" : "");
      })
      .attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
      })
      .attr("data-commitId", function (d) {
        return d.data.commitId;
      })
      .attr("data-filePath", function (d) {
        return d.data.filePath;
      })
      .attr("data-changes", function (d) {
        return JSON.stringify(d.data.changes);
      })

    function update(source) {

      // Compute the new tree layout.
      var nodes = tree.nodes(root).reverse(),
        links = tree.links(nodes);

      // Normalize for fixed-depth.
      nodes.forEach(function (d) { d.y = d.depth * 180; });

      // Update the nodes…
      var node = svg.selectAll("g.node")
        .data(nodes, function (d) { return d.id || (d.id = ++i); });

      // Enter any new nodes at the parent's previous position.
      var nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", function (d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
        .on("click", click);

      nodeEnter.append("circle")
        .attr("r", 1e-6)
        .style("fill", function (d) { return d._children ? "lightsteelblue" : "#fff"; });

      nodeEnter.append("text")
        .attr("x", function (d) { return d.children || d._children ? -13 : 13; })
        .attr("dy", ".35em")
        .attr("text-anchor", function (d) { return d.children || d._children ? "end" : "start"; })
        .text(function (d) { return d.name; })
        .style("fill-opacity", 1e-6);

      // Transition nodes to their new position.
      var nodeUpdate = node.transition()
        .duration(duration)
        .attr("transform", function (d) { return "translate(" + d.y + "," + d.x + ")"; });

      nodeUpdate.select("circle")
        .attr("r", 10)
        .style("fill", function (d) { return d._children ? "lightsteelblue" : "#fff"; });

      nodeUpdate.select("text")
        .style("fill-opacity", 1);

      // Transition exiting nodes to the parent's new position.
      var nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", function (d) { return "translate(" + source.y + "," + source.x + ")"; })
        .remove();

      nodeExit.select("circle")
        .attr("r", 1e-6);

      nodeExit.select("text")
        .style("fill-opacity", 1e-6);

      // Update the links…
      var link = svg.selectAll("path.link")
        .data(links, function (d) { return d.target.id; });

      // Enter any new links at the parent's previous position.
      link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", function (d) {
          var o = { x: source.x0, y: source.y0 };
          return diagonal({ source: o, target: o });
        });

      // Transition links to their new position.
      link.transition()
        .duration(duration)
        .attr("d", diagonal);

      // Transition exiting nodes to the parent's new position.
      link.exit().transition()
        .duration(duration)
        .attr("d", function (d) {
          var o = { x: source.x, y: source.y };
          return diagonal({ source: o, target: o });
        })
        .remove();

      // Stash the old positions for transition.
      nodes.forEach(function (d) {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    function nodeMouseOver(event, d) {
      const toolTipContents = `
        <div>
        By <b>${d.data.committer}</b>, ${timeSince(d.data.date.split("T")[0])}
        <br/>
        <p style="font-style: italics; margin-bottom: 15px;">${d.data.changes}</p>
        <b>${d.data.commitId}</b>
        </div>`;
  

      let fillColor = '#ccffcf';
      if (repo.branch === d.data.commitId) {
        fillColor = "#26a641";
      }

      const element = event.target.getBoundingClientRect();
      toolTip.style("left", element.left + 30 + "px")
        .style("top", element.top - 5 + "px")
        .style("display", "block")
        .html(toolTipContents);

      // Optional cursor change on target
      d3.select(event.target).style("cursor", "pointer");

      // Optional highlight effects on target
      d3.select(event.target)
        .transition()
        .style('fill', fillColor)
        .style('stroke-width', '4px');
    }

    function nodeMouseOut(event, d) {
      let fillColor = '#fff';
      if (repo.branch === d.data.commitId) {
        fillColor = "#26a641";
      }

      toolTip.style("display", "none");

      // Optional cursor change removed
      d3.select(event.target).style("cursor", "default");

      // Optional highlight removed
      d3.select(event.target)
        .transition()
        .style('fill', fillColor)
        .style('stroke-width', '3px');
    }

    // adds the circle to the node
    node.append("circle")
      .attr("r", 12)
      .attr("cursor", "pointer")
      .on('mouseover', nodeMouseOver)
      .on('mouseout', nodeMouseOut)
      .on("click", redirectToCommitPage)
      .on("contextmenu", function (event, d) {
        event.preventDefault();
        // react on right-clicking
        console.log("Right click")
    });


    // adds the text to the node
    const linkColor = "#1287A8";
    node
      .append("a")
      .style("fill", linkColor)
      .style("cursor", "pointer")
      .style("text-decoration", "none")
      .on("mouseover", (event)=>{d3.select(event.target).style("fill", "skyblue");})
      .on("mouseout", (event)=>{d3.select(event.target).style("fill", linkColor);})
      .append("text")
      .attr("dy", ".35em")
      .attr("y", function (d) { return 20; })
      .style("text-anchor", "middle")
      .style("font-weight", "bold")
      .text(function (d) { return d.data.name; })
      .on("click", redirectToCommitPage);
  }

  _initialScreen() {
    this._removeTreeBody();
    const instructions = `
    <div class="octotree-instructions">
      <p>Select a code element to track its refactoring history.</p>
    </div>
    `
    $("body > nav > div.octotree-views > div.octotree-view.octotree-tree-view.current > div.octotree-view-body").append(instructions);
  }

  _removeTreeBody() {
    document.querySelector("body > nav > div.octotree-views > div.octotree-view.octotree-tree-view.current > div.octotree-view-body").innerHTML = null;
  }
}
