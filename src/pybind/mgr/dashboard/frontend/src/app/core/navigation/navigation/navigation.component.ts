import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';

import { Subscription } from 'rxjs';

import { HealthService } from '~/app/shared/api/health.service';
import { Icons } from '~/app/shared/enum/icons.enum';
import { Permissions } from '~/app/shared/models/permissions';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import {
  FeatureTogglesMap$,
  FeatureTogglesService
} from '~/app/shared/services/feature-toggles.service';
import { PrometheusAlertService } from '~/app/shared/services/prometheus-alert.service';
import { RefreshIntervalService } from '~/app/shared/services/refresh-interval.service';
import { SummaryService } from '~/app/shared/services/summary.service';
import { TelemetryNotificationService } from '~/app/shared/services/telemetry-notification.service';



@Component({
  selector: 'cd-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit, OnDestroy {
  notifications: string[] = [];
  @HostBinding('class') get class(): string {
    return 'top-notification-' + this.notifications.length;
  }
  healthData: any;
  interval = new Subscription();
  permissions: Permissions;
  enabledFeature$: FeatureTogglesMap$;
  summaryData: any;
  icons = Icons;

  isCollapsed = true;
  showMenuSidebar = true;
  displayedSubMenu = '';

  simplebar = {
    autoHide: false
  };
  private subs = new Subscription();

  constructor(
    private authStorageService: AuthStorageService,
    private summaryService: SummaryService,
    private featureToggles: FeatureTogglesService,
    private telemetryNotificationService: TelemetryNotificationService,
    public prometheusAlertService: PrometheusAlertService,
    private refreshIntervalService: RefreshIntervalService,
    private healthService: HealthService
  ) {
    this.permissions = this.authStorageService.getPermissions();
    this.enabledFeature$ = this.featureToggles.get();
  }

  ngOnInit() {
    this.subs.add(
      this.summaryService.subscribe((summary) => {
        this.summaryData = summary;
      })
    );
    /*
     Note: If you're going to add more top notifications please do not forget to increase
     the number of generated css-classes in section topNotification settings in the scss
     file.
     */
    this.subs.add(
      this.authStorageService.isPwdDisplayed$.subscribe((isDisplayed) => {
        this.showTopNotification('isPwdDisplayed', isDisplayed);
      })
    );
    this.subs.add(
      this.telemetryNotificationService.update.subscribe((visible: boolean) => {
        this.showTopNotification('telemetryNotificationEnabled', visible);
      })
    );
    this.interval = this.refreshIntervalService.intervalData$.subscribe(() => {
      this.getHealth();
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  getHealth() {
    this.healthService.getMinimalHealth().subscribe((data: any) => {
      this.healthData = data;
    });
  }
  blockHealthColor() {
    if (this.summaryData && this.summaryData.rbd_mirroring) {
      if (this.summaryData.rbd_mirroring.errors > 0) {
        return { color: '#d9534f' };
      } else if (this.summaryData.rbd_mirroring.warnings > 0) {
        return { color: '#f0ad4e' };
      }
    }

    return undefined;
  }

  toggleSubMenu(menu: string) {
    if (this.displayedSubMenu === menu) {
      this.displayedSubMenu = '';
    } else {
      this.displayedSubMenu = menu;
    }
  }

  showTopNotification(name: string, isDisplayed: boolean) {
    if (isDisplayed) {
      if (!this.notifications.includes(name)) {
        this.notifications.push(name);
      }
    } else {
      const index = this.notifications.indexOf(name);
      if (index >= 0) {
        this.notifications.splice(index, 1);
      }
    }
  }
}
