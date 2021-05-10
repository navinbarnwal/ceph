from collections import OrderedDict
import errno
try:
    from typing import Optional, List, Any, Dict
except ImportError:
    pass  # just for type checking


class SpecValidationError(Exception):
    """
    Defining an exception here is a bit problematic, cause you cannot properly catch it,
    if it was raised in a different mgr module.
    """
    def __init__(self,
                 msg: str,
                 errno: int = -errno.EINVAL):
        super(SpecValidationError, self).__init__(msg)
        self.errno = errno


class HostSpec(object):
    """
    Information about hosts. Like e.g. ``kubectl get nodes``
    """
    def __init__(self,
                 hostname: str,
                 addr: Optional[str] = None,
                 labels: Optional[List[str]] = None,
                 status: Optional[str] = None,
                 location: Optional[Dict[str, str]] = None,
                 ):
        self.service_type = 'host'

        #: the bare hostname on the host. Not the FQDN.
        self.hostname = hostname  # type: str

        #: DNS name or IP address to reach it
        self.addr = addr or hostname  # type: str

        #: label(s), if any
        self.labels = labels or []  # type: List[str]

        #: human readable status
        self.status = status or ''  # type: str

        self.location = location

    def to_json(self) -> Dict[str, Any]:
        r: Dict[str, Any] = {
            'hostname': self.hostname,
            'addr': self.addr,
            'labels': list(OrderedDict.fromkeys((self.labels))),
            'status': self.status,
        }
        if self.location:
            r['location'] = self.location
        return r

    @classmethod
    def from_json(cls, host_spec: dict) -> 'HostSpec':
        host_spec = cls.normalize_json(host_spec)
        _cls = cls(
            host_spec['hostname'],
            host_spec['addr'] if 'addr' in host_spec else None,
            list(OrderedDict.fromkeys(
                host_spec['labels'])) if 'labels' in host_spec else None,
            host_spec['status'] if 'status' in host_spec else None,
            host_spec.get('location'),
        )
        return _cls

    @staticmethod
    def normalize_json(host_spec: dict) -> dict:
        labels = host_spec.get('labels')
        if labels is not None:
            if isinstance(labels, str):
                host_spec['labels'] = [labels]
            elif (
                    not isinstance(labels, list)
                    or any(not isinstance(v, str) for v in labels)
            ):
                raise SpecValidationError(
                    f'Labels ({labels}) must be a string or list of strings'
                )

        loc = host_spec.get('location')
        if loc is not None:
            if (
                    not isinstance(loc, dict)
                    or any(not isinstance(k, str) for k in loc.keys())
                    or any(not isinstance(v, str) for v in loc.values())
            ):
                raise SpecValidationError(
                    f'Location ({loc}) must be a dictionary of strings to strings'
                )

        return host_spec

    def __repr__(self) -> str:
        args = [self.hostname]  # type: List[Any]
        if self.addr is not None:
            args.append(self.addr)
        if self.labels:
            args.append(self.labels)
        if self.status:
            args.append(self.status)
        if self.location:
            args.append(self.location)

        return "HostSpec({})".format(', '.join(map(repr, args)))

    def __str__(self) -> str:
        if self.hostname != self.addr:
            return f'{self.hostname} ({self.addr})'
        return self.hostname

    def __eq__(self, other: Any) -> bool:
        # Let's omit `status` for the moment, as it is still the very same host.
        return self.hostname == other.hostname and \
               self.addr == other.addr and \
               sorted(self.labels) == sorted(other.labels) and \
               self.location == other.location
