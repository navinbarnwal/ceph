import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';

import {
  ITreeOptions,
  TreeComponent,
  TreeModel,
  TreeNode,
  TREE_ACTIONS
} from '@circlon/angular-tree-component';
import { Subscription } from 'rxjs';

import { HealthService } from '~/app/shared/api/health.service';
import { Icons } from '~/app/shared/enum/icons.enum';
import { TimerService } from '~/app/shared/services/timer.service';

@Component({
  selector: 'cd-crushmap',
  templateUrl: './crushmap.component.html',
  styleUrls: ['./crushmap.component.scss']
})
export class CrushmapComponent implements OnInit, OnDestroy {
  private sub = new Subscription();

  @ViewChild('tree') tree: TreeComponent;

  icons = Icons;
  loadingIndicator = true;
  nodes: any[] = [];
  treeOptions: ITreeOptions = {
    useVirtualScroll: true,
    nodeHeight: 22,
    actionMapping: {
      mouse: {
        click: this.onNodeSelected.bind(this)
      }
    }
  };

  metadata: any;
  metadataTitle: string;
  metadataKeyMap: { [key: number]: any } = {};

  constructor(
    private crushRuleService: CrushRuleService,
    private healthService: HealthService,
    private timerService: TimerService,
    private titleService: Title
  ) {
    this.titleService.setTitle('Cluster/CRUSH map');
  }

  ngOnInit() {
    this.healthService.getFullHealth().subscribe((data: any) => {
      this.loadingIndicator = false;
      this.nodes = this.abstractTreeData(data);
    });
    this.sub = this.timerService
      .get(() => this.healthService.getFullHealth(), 5000)
      .subscribe((data: any) => {
        this.nodes = this.abstractTreeData(data);
      });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  private abstractTreeData(data: any): any[] {
    const nodes = data.osd_map.tree.nodes || [];
    const treeNodeMap: { [key: number]: any } = {};

    if (0 === nodes.length) {
      return [
        {
          name: 'No nodes!'
        }
      ];
    }

    const roots: any[] = [];
    nodes.reverse().forEach((node: any) => {
      if (node.type === 'root') {
        roots.push(node.id);
      }
      treeNodeMap[node.id] = this.generateTreeLeaf(node, treeNodeMap);
    });

    const children = roots.map((id) => {
      return treeNodeMap[id];
    });

    return children;
  }

  private generateTreeLeaf(node: any, treeNodeMap: any) {
    const cdId = node.id;
    this.metadataKeyMap[cdId] = node;

    const name: string = node.name + ' (' + node.type + ')';
    const status: string = node.status;

    const children: any[] = [];
    const resultNode = { name, status, cdId, type: node.type };
    if (node.children) {
      node.children.sort().forEach((childId: any) => {
        children.push(treeNodeMap[childId]);
      });

      resultNode['children'] = children;
    }

    return resultNode;
  }

  onNodeSelected(tree: TreeModel, node: TreeNode) {
    TREE_ACTIONS.ACTIVATE(tree, node, true);
    if (node.data.cdId !== undefined) {
      const { name, type, status, ...remain } = this.metadataKeyMap[node.data.cdId];
      this.metadata = remain;
      this.metadataTitle = name + ' (' + type + ')';
    } else {
      delete this.metadata;
      delete this.metadataTitle;
    }
  }

  onUpdateData() {
    this.tree.treeModel.expandAll();
  }
}
