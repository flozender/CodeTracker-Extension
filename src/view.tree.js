class TreeView {
  constructor($dom, adapter) {
    this.treeData = {};
    this.adapter = adapter;
    this.selectionText;
    this.lineNumber;
    this.parentMethod;
    this.parentMethodLine;
    this.filePath;
    this.nodeCount;
    this.evoHookData;
    this.expandedSet = new Set();
    this.$view = $dom.find('.octotree-tree-view');
    this.$document = $(document);

    // restore session
    this.sessionFilePath;
    this.sessionSelection;
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
      this.sessionSelection = await window.extStore.get(window.STORE.SELECTION);
      this.sessionLineNumber = await window.extStore.get(window.STORE.LINE_NUMBER);
      this.nodeCount = await window.extStore.get(window.STORE.NODE_COUNT);
    }
    catch (err) {
      console.log("No session", err);
    }
  }

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

  getParentMethodFromDOM_GET = async (node) => {
    let tr = node.parentElement.parentElement;
    let textContent;
    let parentMethod;
    let parentMethodLine;
    let methodRegex = /(public|protected|private|static|\s) +[\w\<\>\[\]]+\s+(\w+) *\([^\)]*\) *(\{?|[^;])/;
    while(true){
      let length = tr.children.length-1;
      textContent = tr.children[length].textContent.trim();
      let matched = textContent.match(methodRegex);
      let isExpandable = $(tr).find('td:first-child:has(a)');
      if(isExpandable.length > 0){
        tr = tr.nextElementSibling;
        isExpandable[0].children[0].click();
        matched = false;
        await sleep(500);
      }
      if (matched){
        parentMethod = matched[2];
        parentMethodLine = $(tr.children[length-1]).data("line-number");
        console.log("Matched regex ", parentMethod, parentMethodLine)
        break;
      }
      try {
        tr = tr.previousElementSibling;
      } catch(e) {
        break;
      }
    }
    return [parentMethod, parentMethodLine];
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
    let textNodes = $(document).find(`div.file.js-file.js-details-container.js-targetable-element`);

    textNodes = textNodes.filter(
      function () {
        let matched = $(this).data("tagsearch-path") === filePath
        return matched;
      });

    return textNodes[0];
  }

  getMethodRow = (fileDiv, selection) => {
    let tds = $(`#${fileDiv.getAttribute('id')} td.js-file-line`)
    tds = tds
      .filter(
        function () {
          return $(this).text().includes(selection);
        });
    return tds[tds.length - 1]
  };

  expandAll = async (node) => {
    let diffNotLoaded = $(node).text().includes("Load diff");
    if (diffNotLoaded) {
      console.log("DIFF UNLOADED")
      node.children[1].children[0].children[0].children[1].children[1].click();
      await sleep(1000);
    }
    try {
      let expandAllButton = node.children[0].children[0].children[1].children[0];
      if (expandAllButton.type == "button") {
        expandAllButton.click();
        console.log("BUTTON EXPANDED", expandAllButton);
      } else {
        throw "No expand all button";
      }
    } catch (err) {
      console.log(err);
      let singleArrows = $(node).find("a.js-expand");
      let seen = new Set();
      let clicked;
      while (singleArrows) {
        clicked = false;
        for (let singleArrow of singleArrows) {
          let rightRange = $(singleArrow).data("right-range");
          if (!seen.has(rightRange)) {
            singleArrow.click();
            clicked = true;
            seen.add(rightRange);
          }
        }
        if (!clicked) {
          break;
        }
        await sleep(500);
        singleArrows = $(node).find("a.js-expand");
        console.log("SINGLE_ARROWS", singleArrows);
      }
    }
    await sleep(600);
  }

  // scrolling main function
  async scrollToCodeElement(filePath, lineNumber) {
    console.log("Scrolling to line " + lineNumber + " in " + filePath);
    let counter = 0;

    const scrollAgainAndTry = async () => {
      console.log("SCROLLING TO LOAD: ", counter);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(1500);
      if (!fileDiv) {
        fileDiv = this.getFileDivFromFilePath(filePath);
      }

      // if span or filediv were not found, scroll more
      if ((!fileDiv) && counter < 5) {
        counter += 1;
        await scrollAgainAndTry();
      }

    }

    const highlightLine = (fileDiv, lineNumber) => {
      let diffHash = $(fileDiv).attr("id");
      let noTextDiv = $(fileDiv).text().includes("File renamed without changes.")

      console.log("NO TEXT", noTextDiv);
      console.log("HIGHLIGHT", lineNumber);
      if (!noTextDiv) {
        diffHash = diffHash + "R" + lineNumber;
      }
      window.location = window.location.toString().split("#")[0] + "#" + diffHash;
    }

    let fileDiv = this.getFileDivFromFilePath(filePath);
    let lineSelected = $(document).find("td.selected-line").length > 0;
    console.log("LINE_SELECTED", lineSelected);

    if (!fileDiv && !lineSelected) {
      await scrollAgainAndTry();
    }

    console.log("FILE_DIV", fileDiv);
    console.log("LINE_NUMBER", lineNumber);

    await this.expandAll(fileDiv);

    // let methodRow = this.getMethodRow(fileDiv, name);
    // console.log("METHOD_ROW", methodRow);
    highlightLine(fileDiv, lineNumber);

    return;
  }

  async show(repo, token) {
    $(document).trigger(EVENT.REPO_LOADED, { repo });
    this._showHeader(repo);
    await this.restoreTreeData();

    if (this.sessionSelection) {
      await this.scrollToCodeElement(this.sessionFilePath, this.sessionLineNumber);
    }
    console.log("TreeData is now", this.treeData);
    if (this.treeData.commitId) {
      this.drawTree(repo);
    } else {
      this._initialScreen()
    }
    $(this).trigger(EVENT.VIEW_READY);
  }

  transformDataForTree = (data, username, reponame, evolution) => {
    let root = { children: [] };
    let treeData = root["children"];
    // let { branch } = currentNode;
    data = data.reverse();
    if (evolution) {
      this.nodeCount += data.length;
    } else {
      this.nodeCount = data.length;
    }
    let parent = "null";
    // check if current commit has a refactoring, if not add a dummy checkpoint node
    // let parent = branch.substring(0, 7);
    for (let commit of data) {
      let filePath = commit.afterPath;
      let lineNumber = commit.afterLine;
      let selection = commit.after;
      let { evolutionHook, evolutionHookLine, evolutionHookPath } = commit;
      console.log( { evolutionHook, evolutionHookLine, evolutionHookPath } );
      selection = selection.substring(0, selection.indexOf("("));
      console.log("TD: selection", selection);
      console.log("TD: FILE_PATH", filePath);
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
        lineNumber,
        selection,
        username,
        reponame,
        children: [],
        evolutionHook, 
        evolutionHookLine, 
        evolutionHookPath
      }
      treeData.push(child);
      treeData = child['children'];
      parent = commitId;
    }

    console.log(root.children[0]);
    return root.children[0];
  };

  getDataFromAPI = async (data) => {
    this._removeTreeBody();
    $(document).trigger(EVENT.REQ_START);
    const { username, reponame, filePath, commitId, selection, lineNumber, evolution, parentMethod, parentMethodLine } = data;
    let params = `owner=${username}&repoName=${reponame}&filePath=${filePath}&commitId=${commitId}&selection=${selection}&lineNumber=${lineNumber}`;
    if (parentMethod){
      params = params + `&parentMethod=${parentMethod}&parentMethodLine=${parentMethodLine}`;
    }
    const getRequest = `${API_URL}/track?${params}`;
    console.log(getRequest);

    let treeData = await fetch(getRequest)
      .then(response => response.json());

    let transformedTreeData = this.transformDataForTree(treeData, username, reponame, evolution);
    $(document).trigger(EVENT.REQ_END);
    return transformedTreeData;
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
        let parentMethod = this.parentMethod;
        let parentMethodLine = this.parentMethodLine;
        this.treeData = await this.getDataFromAPI({ username, reponame, filePath, commitId: branch, selection: selectionText, lineNumber, parentMethod, parentMethodLine });

        this.drawTree(repo);
        this.$document.trigger(EVENT.REQ_END);
      })
      .on('click', '#codeElementReset', async (event) => {
        event.preventDefault();
        this.updateCodeElementSelectionField(null);
        this._initialScreen();
        await window.extStore.set(window.STORE.TREE_DATA, {});
        await window.extStore.set(window.STORE.SELECTION_TEXT, null);
        await window.extStore.set(window.STORE.FILE_PATH, null);
        await window.extStore.set(window.STORE.SELECTION, null);
        await window.extStore.set(window.STORE.LINE_NUMBER, 0);
        await window.extStore.set(window.STORE.NODE_COUNT, 0);
        this.$document.trigger(EVENT.REQ_END);
        const currentUrl = window.location.toString();
        window.location = currentUrl.split("#")[0];
      })

    document.addEventListener('click', async () => {
      await captureSelection();
    });

    const captureSelection = async () => {
      let selection = document.getSelection();

      let selectionText = selection.toString().trim();
      if (selectionText !== "") {
        this.selectionText = selectionText;
        this.updateCodeElementSelectionField(selectionText);
        
        let fileDiv = this.getFileDivFromDOM(selection.anchorNode.parentElement);

        this.filePath = $(fileDiv).data("tagsearch-path");

        let lineNumber = this.getLineNumberFromDOM_GET(selection.anchorNode.parentElement);
        this.lineNumber = lineNumber;
        
        let [parentMethod, parentMethodLine] = await this.getParentMethodFromDOM_GET(selection.anchorNode.parentElement);
        this.parentMethod = parentMethod;
        this.parentMethodLine = parentMethodLine;
        selection.anchorNode.parentElement.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
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

  drawTree = (repo) => {
    const treeBody = "body > nav > div.octotree-views > div.octotree-view.octotree-tree-view.current > div.octotree-view-body";

    let margin = { top: 40, right: 5, bottom: 50, left: 5 },
      width = 200 - margin.left - margin.right,
      height = Math.max((this.nodeCount ? this.nodeCount * 53 : 0), 630)
    height = height - margin.top - margin.bottom;
    $(treeBody)[0].innerHTML = null;
    let svg = d3.select(treeBody).append("svg")
      .attr("id", "codetracker-svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

    var i = 0,
      duration = 500,
      root;

    // declares a tree layout and assigns the size
    let treemap = d3.tree().size([width, height]);


    //  assigns the data to a hierarchy using parent-child relationships
    root = d3.hierarchy(this.treeData);

    root.x0 = width / 2;
    root.y0 = 0;

    // Update
    const update = (source, data) => {

      const { selectionText, nodeCount } = data;

      const redirectToCommitPage = async (event, d) => {
        const { username, reponame, commitId, filePath, selection, lineNumber } = d.data;
        let url = `https://github.com/${username}/${reponame}/commit/${commitId}`;
        console.log(url);

        // store all info to storage for next page
        await window.extStore.set(window.STORE.TREE_DATA, this.treeData);
        await window.extStore.set(window.STORE.SELECTION_TEXT, selectionText);
        await window.extStore.set(window.STORE.FILE_PATH, filePath);
        await window.extStore.set(window.STORE.SELECTION, selection);
        await window.extStore.set(window.STORE.LINE_NUMBER, lineNumber);
        await window.extStore.set(window.STORE.NODE_COUNT, nodeCount);

        window.location = url;
        return url;
      }

      const fillNode = (d, hover) => {
        const currentPage = repo.branch === d.data.commitId;
        if (currentPage && d.data.evolutionHook) {
          return "rgba(245, 240, 173)";
        }
        if (d._children) {
          return "lightsteelblue";
        }
        if (currentPage) {
          return "#ccffcf";
        }
        if (hover && d.data.evolutionHook) {
          return "rgba(245, 240, 173)";
        }
        if (hover) {
          return "#ccffcf"
        }

        return "#fff";
      }

      let toolTip = d3.select(treeBody).append("div").attr("class", "treeToolTip");

      // maps the node data to the tree layout
      var treeDataMap = treemap(root);
      // Compute the new tree layout.
      var nodes = treeDataMap.descendants(),
        links = treeDataMap.descendants().slice(1);
      // Normalize for fixed-depth
      nodes.forEach(function (d) { d.y = d.depth * 50 });

      // adds each node as a group
      let node = svg.selectAll("g.node")
        .data(nodes, function (d) { return d.id || (d.id = ++i); })

      let nodeEnter = node
        .enter().append("g")
        .attr("class", function (d) {
          return "node node--internal" + (repo.branch === d.data.commitId ? " node--active" : "") + (d.data.evolutionHook ? " node--expandable" : "");
        })
        .attr("transform", function (d) {
          return "translate(" + source.x0 + "," + source.y0 + ")";
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


      // adds the circle to the node
      nodeEnter.append("circle")
        .attr('class', 'node')
        .attr('r', 1e-6)
        .attr("cursor", "pointer")
        .on('mouseover', nodeMouseOver)
        .on('mouseout', nodeMouseOut)
        .on("click", redirectToCommitPage)
        .on('contextmenu', async (event, d) => { event.preventDefault(); await rightClick(event, d); })
        .style("fill", (d) => fillNode(d, false))

      // adds the text to the node
      const linkColor = "#1287A8";
      nodeEnter
        .append("a")
        .style("fill", linkColor)
        .style("cursor", "pointer")
        .style("text-decoration", "none")
        .on("mouseover", (event) => { d3.select(event.target).style("fill", "skyblue"); })
        .on("mouseout", (event) => { d3.select(event.target).style("fill", linkColor); })
        .append("text")
        .attr("dy", ".35em")
        .attr("y", function (d) { return 20; })
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text(function (d) { return d.data.name; })
        .on("click", redirectToCommitPage);

      var nodeUpdate = nodeEnter.merge(node);

      nodeUpdate.transition()
        .duration(duration)
        .attr("transform", function (d) {
          return "translate(" + d.x + "," + d.y + ")";
        });

      // Update the node attributes and style
      nodeUpdate.select('circle.node')
        .attr('r', 12)
        .style("fill", (d) => fillNode(d, false))
        .attr('cursor', 'pointer');

      let nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", function (d) {
          return "translate(" + source.x + "," + source.y + ")";
        })
        .remove();

      // On exit reduce the node circles size to 0
      nodeExit.select('circle')
        .attr('r', 1e-6);

      // On exit reduce the opacity of text lables  
      nodeExit.select('text')
        .style('fill-opacity', 1e-6)

      // adds the links between the nodes
      let link = svg.selectAll(".link")
        .data(links, function (d) { return d.id; })

      let linkEnter = link
        .enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", function (d) {
          var o = { x: source.x0, y: source.y0 };
          return diagonal(o, o);
        });

      var linkUpdate = linkEnter.merge(link);

      // Transition back to the parent element position
      linkUpdate.transition()
        .duration(duration)
        .attr('d', function (d) {

          return diagonal(d, d.parent)
        });

      // Remove any existing links
      var linkExit = link.exit().transition()
        .duration(duration)
        .attr('d', function (d) {
          var o = { x: source.x, y: source.y };
          return diagonal(o, o);
        })
        .remove();

      // Store the old positions for transition.
      nodes.forEach(function (d) {
        d.x0 = d.x;
        d.y0 = d.y;
      });

      // Create a curved (diagonal) path from parent to the child nodes
      function diagonal(s, d) {
        let path = `M ${s.x} ${s.y}
    C ${(s.x + d.x) / 2} ${s.y},
      ${(s.x + d.x) / 2} ${d.y},
      ${d.x} ${d.y}`

        return path;
      }

      const getEvolutionHookData = async (node) => {
        const { username, reponame, commitId, evolutionHook, evolutionHookPath, evolutionHookLine } = node.data;
        let parentMethod = evolutionHook.split("#")[1];
        parentMethod = parentMethod.substring(0, parentMethod.indexOf("("));
        console.log(`Evolution Hook Data for: ${parentMethod} in file ${evolutionHookPath} at line ${evolutionHookLine}`);
        const childData = await this.getDataFromAPI({ username, reponame, filePath: evolutionHookPath, commitId, selection: parentMethod, lineNumber: evolutionHookLine, evolution: true });
        return childData;
      }

      // Toggle children on click
      const rightClick = async (event, d) => {
        if (d.data.evolutionHook && !d.children && !d._children) {
          let evoHookData = await getEvolutionHookData(d);
          let selected = d;
          let childRoot = [];
          let childArray = childRoot;

          let parent = selected;
          let current = evoHookData;

          if (current.commitId == selected.data.commitId) {
            current = current["children"][0]
          }

          // add the children to the treedata obj
          let iter = this.treeData;
          while (iter && iter.commitId !== selected.data.commitId) {
            iter = iter.children[0];
          }

          iter.children = [current];

          while (current) {
            var obj = d3.hierarchy(current);
            obj.parent = parent?.data?.commitId || parent.commitId;
            obj.depth = parent.depth + 1;
            obj.height = parent.height - 1;

            obj.children = [];
            obj._children = null;

            childArray.push(obj);

            childArray = obj.children;
            parent = current;
            current = current.children[0];
          }

          selected.children = childRoot;
          this.drawTree(repo);
        }

        if (d.children) {
          d._children = d.children;
          d.children = null;
        }
        else {
          d.children = d._children;
          d._children = null;
        }
        update(d, data);
      }

      function nodeMouseOver(event, d) {
        const toolTipContents = `
        <div>
        By <b>${d.data.committer}</b>, ${timeSince(d.data.date.split("T")[0])}
        <br/>
        <p style="font-style: italics; margin-bottom: 15px;">${d.data.changes.map((change) => { return change.split("<").join("&lt;") })}</p>
        <b>${d.data.commitId}</b>
        </div>`;

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
          .style('fill', (d) => fillNode(d, true))
          .style('stroke-width', '4px');
      }

      function nodeMouseOut(event, d) {

        toolTip.style("display", "none");

        // Optional cursor change removed
        d3.select(event.target).style("cursor", "default");

        // Optional highlight removed
        d3.select(event.target)
          .transition()
          .style('fill', (d) => fillNode(d, false))
          .style('stroke-width', '3px');
      }
    }

    update(root, {
      selectionText: this.selectionText,
      nodeCount: this.nodeCount,
    });

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
